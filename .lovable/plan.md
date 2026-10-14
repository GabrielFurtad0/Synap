## Firebase Integration Plan

### 1. Dependencies
- Install `firebase` (Web SDK v10+) via `bun add firebase`.

### 2. Firebase setup — `src/lib/firebase.ts`
- Initialize Firebase App with a clearly-marked placeholder config object (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) that the user replaces with real values.
- Export `app`, `auth`, `db` (Firestore), and a configured `googleProvider` (`GoogleAuthProvider`).
- Guard against duplicate initialization (`getApps().length`).

### 3. Auth context — `src/lib/auth-context.tsx`
- `AuthProvider` wrapping the app, subscribing to `onAuthStateChanged`.
- Exposes `{ user, loading, signInWithGoogle, signOut }` via `useAuth()`.
- Wrap `<Outlet />` in `src/routes/__root.tsx` with `<AuthProvider>`.

### 4. Login gate
- New component `src/components/login-screen.tsx`: dark, minimalist, centered card with app name, tagline, and a "Sign in with Google" button (Google G icon + label, matches existing dark theme tokens).
- In `src/routes/index.tsx`: if `loading` show spinner; if no `user` render `<LoginScreen />`; else render `<TaskBoard />`.

### 5. Firestore data layer — `src/lib/firestore.ts`
Helpers scoped to current `userId`:
- `tasksCol(uid)` → `collection(db, 'tasks')` with `where('userId','==',uid)` queries.
- `projectsCol(uid)` → same pattern for `projects`.
- `subscribeTasks(uid, cb)` / `subscribeProjects(uid, cb)` using `onSnapshot` for realtime sync.
- `createTask`, `updateTask` (partial), `deleteTask`, `createProject`, `deleteProject`.
- All writes stamp `userId: auth.currentUser.uid`, `createdAt: serverTimestamp()`, `updatedAt: serverTimestamp()`.

### 6. Refactor `src/components/task-board.tsx`
Replace in-memory `useState` arrays with Firestore-bound state:
- On mount, subscribe to tasks + projects for current user; unsubscribe on unmount.
- Seed defaults on first login: if `projects` snapshot is empty, batch-write the default project list (Inbox, Personal, Work, etc.) into Firestore for that user.
- All mutations call Firestore helpers (no optimistic local mutation needed — `onSnapshot` reflects state):
  - **Drag-and-drop**: `updateTask(id, { status })`.
  - **Add task**: `createTask({ title, status, projectId, ... })`.
  - **Modal edits**: priority, due date, tags, subtasks, description → `updateTask`.
  - **Star toggle** in modal → `updateTask(id, { isStarred: boolean })`.
  - **Create project** in sidebar → `createProject({ name })`.
- Subtasks stored as an array field on the task document; modal edits write the full updated array back via `updateTask`.

### 7. Settings modal
- Add minimal Settings dialog (triggered from existing Settings sidebar item) showing the signed-in user (avatar + email) and a "Sign Out" button calling `auth.signOut()`.

### 8. Data shapes (Firestore)
```text
tasks/{autoId}
  userId, title, description, status, projectId,
  priority, due (ISO string | null), tags[], subtasks[],
  isStarred (bool), createdAt, updatedAt

projects/{autoId}
  userId, name, color?, createdAt
```

### 9. Out of scope
- No Firestore security rules file is generated here; user must paste rules in Firebase console (will note in chat after build): `match /tasks/{id} { allow read, write: if request.auth.uid == resource.data.userId; }` plus matching create rule, and same for `projects`.
- No offline persistence toggle, no email/password auth, no storage uploads.

### Technical notes
- `onSnapshot` listeners are set up inside an effect keyed on `user.uid`; teardown on sign-out.
- Until the user pastes real Firebase config into `firebase.ts`, sign-in will fail with a clear console error — this is expected.
- All existing UI (Kanban columns, drag-and-drop, modal, conceptual map, AI panel, filters) stays intact; only state source changes.
