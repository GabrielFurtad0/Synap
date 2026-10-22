import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type Status = "todo" | "doing" | "done";
export type Priority = "low" | "med" | "high";

export type SubtaskMode = "checklist" | "qa";

export type SubTask = {
  id: string;
  label: string;
  due?: string;
  done?: boolean;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  children?: SubTask[];
};

export type ExecutionStatus = "idle" | "queued" | "running" | "completed" | "error";

export type TaskDoc = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: Status;
  projectId?: string;
  project: string; // project name (denormalized)
  due?: string;
  priority?: Priority;
  tags: string[];
  subtasks?: SubTask[];
  subtaskMode?: SubtaskMode;
  isStarred?: boolean;
  assignedTo?: string;
  executionRequested?: boolean;
  executionStatus?: ExecutionStatus;
  executionLog?: string;
};

export type ProjectDoc = {
  id: string;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  path?: string;
  hideInInbox?: boolean;
};

const TASKS = "tasks";
const PROJECTS = "projects";

function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function subscribeTasks(
  userId: string,
  cb: (tasks: TaskDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, TASKS), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, "id">) })));
    },
    (err) => {
      console.error("Firestore subscribeTasks error:", err);
      onError?.(err);
    }
  );
}

export function subscribeProjects(
  userId: string,
  cb: (projects: ProjectDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, PROJECTS), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDoc, "id">) })));
    },
    (err) => {
      console.error("Firestore subscribeProjects error:", err);
      onError?.(err);
    }
  );
}

export async function createTask(userId: string, data: Omit<TaskDoc, "id" | "userId">) {
  return addDoc(collection(db, TASKS), {
    ...cleanObject(data),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(id: string, patch: Partial<Omit<TaskDoc, "id" | "userId">>) {
  await updateDoc(doc(db, TASKS, id), { ...cleanObject(patch), updatedAt: serverTimestamp() });
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db, TASKS, id));
}

export async function createProject(userId: string, data: Omit<ProjectDoc, "id" | "userId">) {
  return addDoc(collection(db, PROJECTS), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  });
}

export async function updateProject(id: string, patch: Partial<Omit<ProjectDoc, "id" | "userId">>) {
  await updateDoc(doc(db, PROJECTS, id), cleanObject(patch));
}

export async function deleteProject(id: string) {
  await deleteDoc(doc(db, PROJECTS, id));
}

export const DEFAULT_PROJECTS: Array<Omit<ProjectDoc, "id" | "userId">> = [
  { name: "Inbox", color: "bg-slate-400" },
  { name: "Nimbus Q3", color: "bg-violet-400" },
  { name: "Platform", color: "bg-sky-400" },
  { name: "Growth", color: "bg-emerald-400" },
  { name: "Marketing", color: "bg-amber-400" },
  { name: "Insights", color: "bg-rose-400" },
];

export async function seedDefaultProjects(userId: string) {
  const batch = writeBatch(db);
  for (const p of DEFAULT_PROJECTS) {
    const ref = doc(collection(db, PROJECTS));
    batch.set(ref, { ...p, userId, createdAt: serverTimestamp() });
  }
  await batch.commit();
}