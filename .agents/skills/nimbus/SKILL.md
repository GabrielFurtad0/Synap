---
name: nimbus-task-manager
description: >-
  Work with Nimbus Kanban tasks in Firestore: read backlog, update task progress,
  move tasks between columns (todo, doing, done), append developer notes, and create new tasks.
---

# Nimbus Task Manager AI Workflow

This skill guides the agent on how to interact with the user's Nimbus Task Manager board.

## Available Tools

The `nimbus` MCP server exposes:
* `nimbus_list_tasks(status?, project?, priority?, limit?)`: Lists tasks on the Kanban board.
* `nimbus_get_task(taskId)`: Retrieves complete task metadata, description, and subtasks.
* `nimbus_create_task(title, description?, status?, project?, priority?, tags?, subtasks?)`: Adds a new task to the board.
* `nimbus_update_task(taskId, status?, title?, description?, appendNotes?, priority?, subtasks?, isStarred?)`: Updates a task. Use `appendNotes` to add developer notes with timestamps.
* `nimbus_delete_task(taskId)`: Deletes a task.
* `nimbus_list_projects()`: Lists all projects.

## Standard Development Workflow

When the user asks you to implement or take on a task from the board:

1. **Discover:** Call `nimbus_list_tasks({ status: "todo" })` to see what needs to be done.
2. **Select & Inspect:** Call `nimbus_get_task({ taskId })` to read the full context, acceptance criteria, and subtasks.
3. **Start:** Call `nimbus_update_task({ taskId, status: "doing" })` so the user sees the card move to "In Progress" in real time.
4. **Implement:** Write the code, run tests, and fix any issues in the workspace.
5. **Report & Complete:** Call `nimbus_update_task({ taskId, status: "done", appendNotes: "Summary of changes and validation..." })` to record what was accomplished and move the task to "Done".
