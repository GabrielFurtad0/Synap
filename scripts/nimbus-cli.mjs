import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const keyPath = path.join(rootDir, "serviceAccountKey.json");
if (!fs.existsSync(keyPath)) {
  console.error("Arquivo serviceAccountKey.json não encontrado!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const [,, cmd, ...args] = process.argv;

async function main() {
  if (!cmd || cmd === "list") {
    const statusFilter = args[0];
    let q = db.collection("tasks");
    if (statusFilter) q = q.where("status", "==", statusFilter);
    const snap = await q.get();
    console.log(`\n📋 Nimbus Tasks (${snap.size}):\n`);
    snap.forEach((doc) => {
      const t = doc.data();
      const statusIcon = t.status === "done" ? "✅" : t.status === "doing" ? "⏳" : "📌";
      console.log(`${statusIcon} [${doc.id}] ${t.title} (${t.project || "Inbox"}) - Status: ${t.status} | Prio: ${t.priority || "med"}`);
      if (t.subtasks && t.subtasks.length) {
        console.log(`   Subtasks: ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} concluídas`);
      }
    });
    console.log();
    return;
  }

  if (cmd === "get") {
    const id = args[0];
    if (!id) return console.error("Uso: node scripts/nimbus-cli.mjs get <taskId>");
    const doc = await db.collection("tasks").doc(id).get();
    if (!doc.exists) return console.error(`Task ${id} não encontrada`);
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
    return;
  }

  if (cmd === "move") {
    const [id, status] = args;
    if (!id || !status) return console.error("Uso: node scripts/nimbus-cli.mjs move <taskId> <todo|doing|done>");
    await db.collection("tasks").doc(id).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Task ${id} movida para '${status}' com sucesso!`);
    return;
  }

  if (cmd === "note") {
    const [id, ...textParts] = args;
    const note = textParts.join(" ");
    if (!id || !note) return console.error("Uso: node scripts/nimbus-cli.mjs note <taskId> <texto>");
    const ref = db.collection("tasks").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return console.error(`Task ${id} não encontrada`);
    const curr = doc.data()?.description || "";
    const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
    const updatedDesc = curr ? `${curr}\n\n--- [AGY - ${ts}]:\n${note}` : `--- [AGY - ${ts}]:\n${note}`;
    await ref.update({
      description: updatedDesc,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Nota anexada à task ${id}!`);
    return;
  }

  if (cmd === "create") {
    const [title, status = "todo", project = "Nimbus"] = args;
    if (!title) return console.error("Uso: node scripts/nimbus-cli.mjs create <titulo> [status] [projeto]");
    const snap = await db.collection("tasks").limit(1).get();
    const userId = snap.empty ? "user" : snap.docs[0].data().userId;
    const res = await db.collection("tasks").add({
      userId,
      title,
      status,
      project,
      priority: "med",
      tags: [],
      isStarred: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Task criada com sucesso! ID: ${res.id}`);
    return;
  }

  if (cmd === "projects") {
    const snap = await db.collection("projects").get();
    console.log(`\n📁 Projects (${snap.size}):\n`);
    snap.forEach((doc) => {
      const p = doc.data();
      console.log(`• [${doc.id}] ${p.name} (color: ${p.color || "default"}, icon: ${p.icon || "default"})`);
    });
    console.log();
    return;
  }

  console.log("Comandos disponíveis: list, get, move, note, create, projects");
}

main().catch(console.error);
