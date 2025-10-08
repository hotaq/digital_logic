

# CVocp Quiz Solver Extension
(just 2 second)
This folder contains a Manifest V3 Chrome extension that runs the quiz-solving script automatically on pages that match `*cvocp*` in their URL.

## Load in Chrome

1. Open `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and pick this `quiz-extension` folder.
3. Navigate to the quiz page. Once the questions render, the solver will iterate through the choices and alert when it finishes.

## Notes

- Adjust the `matches` list in `manifest.json` if your quiz lives on a more specific URL.
- The script runs only once per page load and avoids jQuery so no extra libraries are required.
