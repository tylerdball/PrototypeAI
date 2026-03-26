"""Nielsen's 10 Usability Heuristics definitions."""

HEURISTICS: list[dict] = [
    {
        "id": 1,
        "name": "Visibility of System Status",
        "description": (
            "The system should always keep users informed about what is going on, "
            "through appropriate feedback within reasonable time. Users should never "
            "be left wondering whether their action was received or what the system is currently doing."
        ),
        "evaluation_focus": (
            "Does the UI provide timely, clear feedback after every user action? "
            "Are loading states, progress indicators, confirmations, and status changes visible?"
        ),
        "good_examples": [
            "Progress bar showing file upload percentage",
            "Button changes to 'Saving...' spinner while a form submits",
            "Breadcrumb trail showing current location in multi-step flow",
            "Toast notification confirming a record was saved",
            "Active/selected state highlighted in navigation",
        ],
        "bad_examples": [
            "Button that shows no response when clicked",
            "Form that clears without any success or error message",
            "Background process running with no visual indicator",
            "Navigation menu with no highlight on the current page",
        ],
    },
    {
        "id": 2,
        "name": "Match Between System and the Real World",
        "description": (
            "The system should speak the users' language, using words, phrases, and concepts "
            "familiar to the user rather than system-oriented jargon. Information should appear "
            "in a natural and logical order that mirrors real-world conventions."
        ),
        "evaluation_focus": (
            "Does the UI use plain, familiar language rather than technical or internal terminology? "
            "Do icons, metaphors, and workflows match real-world expectations and mental models?"
        ),
        "good_examples": [
            "Trash/Recycle Bin icon for deletion",
            "Shopping cart metaphor in e-commerce",
            "Folder and file metaphors in file managers",
            "Using 'Save' instead of 'Persist to disk'",
            "Date pickers that match a physical calendar layout",
        ],
        "bad_examples": [
            "Error codes like 'ERR_NULL_REF' shown to end users",
            "Technical database field names exposed in forms",
            "Numbered workflow steps that don't match real-world process order",
            "Icons with no real-world equivalent or universally understood meaning",
        ],
    },
    {
        "id": 3,
        "name": "User Control and Freedom",
        "description": (
            "Users often choose system functions by mistake and need a clearly marked 'emergency exit' "
            "to leave the unwanted state without having to go through an extended dialogue. "
            "Support undo, redo, and easy navigation back to a previous state."
        ),
        "evaluation_focus": (
            "Can users easily undo, cancel, or reverse actions? "
            "Is there always a clear escape route from any state or modal the user ends up in?"
        ),
        "good_examples": [
            "Undo/Redo keyboard shortcuts and toolbar buttons",
            "Cancel button on every modal and dialog",
            "Soft-delete with a restore option before permanent removal",
            "Back button or breadcrumbs to leave a deep page",
            "Dismiss/close button on notifications and overlays",
        ],
        "bad_examples": [
            "Delete confirmation with no undo after confirmation",
            "Multi-step form with no way to go back to a previous step",
            "Modal with no close button or Escape key support",
            "Irreversible bulk action with a single click",
        ],
    },
    {
        "id": 4,
        "name": "Consistency and Standards",
        "description": (
            "Users should not have to wonder whether different words, situations, or actions mean "
            "the same thing. Follow platform conventions and internal design consistency so that "
            "similar elements behave in the same way throughout the product."
        ),
        "evaluation_focus": (
            "Are similar UI elements styled and behaving consistently throughout the interface? "
            "Does the product follow established platform conventions (OS, web, mobile)?"
        ),
        "good_examples": [
            "Primary action button uses the same color and style everywhere",
            "Consistent use of icons — same icon always means the same action",
            "Standard placement of navigation (top bar or left sidebar, never both)",
            "Dates always formatted the same way across the UI",
            "Destructive actions consistently styled in red/danger styling",
        ],
        "bad_examples": [
            "Save is a button in one place and a link in another",
            "Different modal layouts for similar types of dialogs",
            "Inconsistent capitalization in labels and buttons",
            "Some pages use a sidebar, others use a top nav",
        ],
    },
    {
        "id": 5,
        "name": "Error Prevention",
        "description": (
            "Even better than good error messages is a careful design that prevents problems from "
            "occurring in the first place. Eliminate error-prone conditions or check for them and "
            "present users with a confirmation option before they commit to an action."
        ),
        "evaluation_focus": (
            "Does the UI proactively prevent errors through constraints, confirmations, and inline "
            "validation? Are dangerous or irreversible actions guarded with extra friction?"
        ),
        "good_examples": [
            "Inline form validation that flags errors before submission",
            "Disable submit button until required fields are filled",
            "Confirmation dialog before permanent deletion",
            "Date picker that prevents selecting past dates when future is required",
            "Autosave to prevent data loss on accidental navigation",
        ],
        "bad_examples": [
            "Free-text email field with no format validation",
            "Delete button with no confirmation step",
            "Form that clears all input on validation failure",
            "Overlapping click targets that cause accidental activations",
        ],
    },
    {
        "id": 6,
        "name": "Recognition Rather Than Recall",
        "description": (
            "Minimize the user's memory load by making objects, actions, and options visible. "
            "The user should not have to remember information from one part of the interface to "
            "another; instructions should be visible or easily retrievable."
        ),
        "evaluation_focus": (
            "Are options, labels, and relevant context visible at the point of use? "
            "Does the user need to memorize information from one screen to use it on another?"
        ),
        "good_examples": [
            "Dropdown menus showing all available options rather than requiring typed commands",
            "Recently used items surfaced in file open dialogs",
            "Visible keyboard shortcuts on menu items",
            "Inline field hints or placeholder examples in forms",
            "Search autocomplete with suggestions",
        ],
        "bad_examples": [
            "Command-line-style interface requiring users to remember exact syntax",
            "Wizard step 3 requiring data entered on step 1 with no summary visible",
            "Settings page with no search and dozens of buried options",
            "Icons without labels that require memorization of their meaning",
        ],
    },
    {
        "id": 7,
        "name": "Flexibility and Efficiency of Use",
        "description": (
            "Accelerators — unseen by novice users — may often speed up the interaction for expert "
            "users so that the system can cater to both inexperienced and experienced users. "
            "Allow users to tailor frequent actions."
        ),
        "evaluation_focus": (
            "Does the UI offer shortcuts, power-user features, or customization for expert users "
            "without overwhelming novices? Can frequent tasks be performed quickly?"
        ),
        "good_examples": [
            "Keyboard shortcuts for common actions",
            "Bulk actions for power users managing many records",
            "Customizable dashboard or pinned shortcuts",
            "Command palette (Cmd+K style) for quick navigation",
            "Saved filters or templates for repeated workflows",
        ],
        "bad_examples": [
            "No keyboard navigation support in a data-heavy application",
            "Every action requires navigating through 3+ menus with no shortcut",
            "No way to select multiple items for bulk operations",
            "No way to save or reuse common configurations",
        ],
    },
    {
        "id": 8,
        "name": "Aesthetic and Minimalist Design",
        "description": (
            "Dialogues should not contain irrelevant or rarely needed information. "
            "Every extra unit of information in a dialogue competes with the relevant information "
            "and diminishes its relative visibility."
        ),
        "evaluation_focus": (
            "Is the UI free of clutter, visual noise, and irrelevant content? "
            "Does every element on screen serve a clear purpose, or are there decorative or redundant elements?"
        ),
        "good_examples": [
            "Clean dashboard that surfaces only the most important metrics",
            "Progressive disclosure — advanced options hidden until needed",
            "Generous whitespace that separates distinct sections",
            "A focused checkout flow with no promotional distractions",
            "Minimal color palette that uses color to signal meaning, not decoration",
        ],
        "bad_examples": [
            "A form with 20 fields when 5 would suffice",
            "Dashboard crowded with charts, banners, and tooltips all competing for attention",
            "Decorative illustrations that slow page load and add no value",
            "Long legal disclaimers embedded in the main workflow",
        ],
    },
    {
        "id": 9,
        "name": "Help Users Recognize, Diagnose, and Recover From Errors",
        "description": (
            "Error messages should be expressed in plain language (no codes), precisely indicate "
            "the problem, and constructively suggest a solution. Good error messages turn a "
            "frustrating moment into an actionable one."
        ),
        "evaluation_focus": (
            "When errors occur, are messages clear, human-readable, and actionable? "
            "Do they explain what went wrong and how to fix it, without blame or jargon?"
        ),
        "good_examples": [
            "'Password must be at least 8 characters and include a number' rather than 'Invalid password'",
            "Error page with a 'Try again' button and link to contact support",
            "Inline field error highlighting the exact field that failed",
            "Network error with suggested action: 'Check your connection and retry'",
            "Form preserving entered data after a failed submission",
        ],
        "bad_examples": [
            "Generic 'An error occurred' with no further detail",
            "HTTP status codes (500, 403) shown raw to the user",
            "Error message that clears the form, losing the user's input",
            "Validation error shown only at the top of a long form with no field highlighting",
        ],
    },
    {
        "id": 10,
        "name": "Help and Documentation",
        "description": (
            "Even though it is better if the system can be used without documentation, it may be "
            "necessary to provide help and documentation. Any such information should be easy to "
            "search, focused on the user's task, list concrete steps to be carried out, and not "
            "be too large."
        ),
        "evaluation_focus": (
            "Is contextual help available where users are likely to need it? "
            "Is documentation discoverable, task-focused, and concise rather than encyclopaedic?"
        ),
        "good_examples": [
            "Tooltip on hover explaining what a setting does",
            "Inline 'Learn more' links next to complex options",
            "Searchable help center accessible from within the app",
            "Onboarding walkthroughs for first-time users",
            "Empty state with guidance on how to get started",
        ],
        "bad_examples": [
            "No help link anywhere in the interface",
            "Documentation that opens in a separate site with no contextual anchor",
            "Help tooltips that simply repeat the label text verbatim",
            "No empty-state guidance — blank screen when there is no data",
        ],
    },
]
