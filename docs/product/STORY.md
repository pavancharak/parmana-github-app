# Parmana: why a company would use it

Parmana is a tool that watches the permission settings of AI helpers in a company's code, and stops risky changes before they go live.

## A day in the life

Ravi is a developer at a mid-sized company. He wants his AI helper to fix a bug in the payment system, so he edits the helper's settings file to let it run a few commands on the server. He sends his change for review.

Before anyone reads the code, Parmana checks the settings. It sees that the helper can now run commands on the live server, which the company's rule doesn't allow without a second person signing off. Parmana marks the change as blocked and tells Ravi why, in one sentence.

Ravi's manager, Meera, gets a message showing exactly what changed. She reads the note, decides it's needed for the bug fix, and approves that exact version. The change goes through. If Ravi makes another edit later, Meera has to approve again.

Three months later, the auditor asks who can run commands on the live server and who approved it. Meera opens Parmana and has the full history in a few clicks, with a record that proves each decision was made when it says.

## Why a company should use it

AI helpers are being added to code quickly, and their permissions change every week. Most companies can't say what their helpers are allowed to do, or who said yes. Parmana makes that visible, stops the risky changes that slip through, and keeps a record for the auditors.

## What it will let a company do

- See every AI helper in its code and what each one is allowed to do.
- Stop a permission increase from going live without the right person approving it.
- Answer an auditor's questions in an afternoon, not weeks.
- Let developers keep moving, because the blocks are explained and the approvals are quick.

## Where it stands today

The first version covers one code repository and one kind of settings file, and it starts by only reporting what it would block. Parmana is not yet running live. The service is waiting on an account restriction with AWS, and the approval step and the record for auditors are still being built.
