export const PRACTICE_ENTRY_SELECTOR = "[data-practice-entry-panel]";

export function scrollPracticeEntryIntoView(
  root: Pick<Document, "querySelector"> = document,
) {
  const practiceEntry = root.querySelector(PRACTICE_ENTRY_SELECTOR);

  if (!practiceEntry) {
    return false;
  }

  practiceEntry.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  return true;
}
