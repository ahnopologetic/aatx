**Goal:**
Design a seamless user experience and flow for **AATX Coder**, an AI agent that automatically implements analytics tracking events in the connected codebase and creates GitHub PRs. The flow begins at the **Tracking Plan screen** and ends with PR review/confirmation.

---

### User Flow Requirements

1. **Entry Point**

   * From the **Tracking Plan detail screen**, users can launch **AATX Coder** to implement new or unimplemented events.
   * Entry as a button: `Ask AATX Coder`.

2. **Auto-Detection of Events**

   * AATX Coder automatically detects **unimplemented events** in the tracking plan using repo analysis.
   * User doesn’t manually pick a repo/branch — it is **auto-detected** from the connected repositories.

3. **Progress & Logging (Foreground Execution)**

   * Show a **real-time log stream**, grouped by tool (similar to the “Repository Analysis” screenshot you shared).
   * Example stages:

     * Cloning GitHub repo
     * Analyzing code for event locations
     * Generating tracking code snippets
     * Applying patches
     * Preparing GitHub PR
   * Provide a **Stop** button to cancel.

4. **Background Option**

   * Provide a button **“Run in Background”**.
   * If selected, the process continues in background and the user is **notified** when the PR is ready.

5. **Review Screen**

   * After logs complete, show a **review screen**:

     * Suggested code changes (diff view).
     * Summary of implemented events.
     * Branch & PR metadata.
   * Buttons:

     * **Approve & Create PR**
     * **Redo** (reruns AATX Coder with default behavior).
     * **Redo with Prompt** → Dropdown opens an input box where user gives custom instruction for the agent before retry.

6. **Confirmation**

   * Show success modal:

     * “PR successfully created in GitHub.”
     * With link to PR.

---

### Screens to Design

1. **Tracking Plan Detail (with Ask AATX Coder entry)**
2. **AATX Coder Progress Screen** (real-time log stream grouped by tools, Stop button, Background option).
3. **PR Review Screen** (diff viewer, event summary, Redo buttons).
4. **Success Confirmation Modal** (with PR link).

---

### UX Notes

* Use consistent style with existing dashboard UI (cards, sidebar, tabs).
* Maintain clarity: logs are **developer-readable** (step-by-step agent actions).
* Review screen should balance **readability** and **technical detail** (diffs + event metadata).

