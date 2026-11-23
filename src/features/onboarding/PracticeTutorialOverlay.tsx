import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { PRACTICE_TUTORIAL_STEPS } from "./practiceTutorial";

type SpotlightLayout = {
  highlight: CSSProperties;
  card: CSSProperties;
} | null;

const highlightPadding = 8;
const cardGap = 18;
const cardMaxWidth = 380;
const cardEstimatedHeight = 245;
const viewportMargin = 16;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function getSpotlightLayout(target: Element): SpotlightLayout {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(cardMaxWidth, viewportWidth - viewportMargin * 2);
  const highlightLeft = Math.max(viewportMargin, rect.left - highlightPadding);
  const highlightTop = Math.max(viewportMargin, rect.top - highlightPadding);
  const highlightRight = Math.min(
    viewportWidth - viewportMargin,
    rect.right + highlightPadding,
  );
  const highlightBottom = Math.min(
    viewportHeight - viewportMargin,
    rect.bottom + highlightPadding,
  );

  let cardLeft = clamp(
    rect.left + rect.width / 2 - cardWidth / 2,
    viewportMargin,
    viewportWidth - cardWidth - viewportMargin,
  );
  let cardTop = rect.bottom + cardGap;

  if (viewportWidth - rect.right >= cardWidth + cardGap + viewportMargin) {
    cardLeft = rect.right + cardGap;
    cardTop = clamp(
      rect.top,
      viewportMargin,
      viewportHeight - cardEstimatedHeight - viewportMargin,
    );
  } else if (rect.left >= cardWidth + cardGap + viewportMargin) {
    cardLeft = rect.left - cardWidth - cardGap;
    cardTop = clamp(
      rect.top,
      viewportMargin,
      viewportHeight - cardEstimatedHeight - viewportMargin,
    );
  } else if (
    rect.bottom + cardGap + cardEstimatedHeight >
    viewportHeight - viewportMargin
  ) {
    cardTop = rect.top - cardGap - cardEstimatedHeight;
  }

  cardTop = clamp(
    cardTop,
    viewportMargin,
    viewportHeight - cardEstimatedHeight - viewportMargin,
  );

  return {
    highlight: {
      left: highlightLeft,
      top: highlightTop,
      width: Math.max(0, highlightRight - highlightLeft),
      height: Math.max(0, highlightBottom - highlightTop),
    },
    card: {
      left: cardLeft,
      top: cardTop,
      width: cardWidth,
    },
  };
}

export function PracticeTutorialOverlay({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<SpotlightLayout>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const step = PRACTICE_TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === PRACTICE_TUTORIAL_STEPS.length - 1;

  useLayoutEffect(() => {
    function updateLayout() {
      const target = document.querySelector(step.target);
      setLayout(target ? getSpotlightLayout(target) : null);
    }

    updateLayout();
    const frame = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [step.target]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((current) => current - 1);
      }

      if (event.key === "ArrowRight" && !isLastStep) {
        setStepIndex((current) => current + 1);
      }

      if (event.key !== "Tab") {
        return;
      }

      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? [],
      );
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];

      if (!firstButton || !lastButton) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstButton ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        lastButton.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLastStep, onClose, stepIndex]);

  return (
    <div className={`main-tutorial${layout ? "" : " main-tutorial--centered"}`}>
      <div className="main-tutorial__interaction-blocker" aria-hidden="true" />
      {layout ? (
        <div
          className="main-tutorial__spotlight"
          style={layout.highlight}
          aria-hidden="true"
        />
      ) : null}

      <div
        ref={dialogRef}
        className="main-tutorial__card"
        style={layout?.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-tutorial-title"
        aria-describedby="practice-tutorial-description"
        tabIndex={-1}
      >
        <div
          className="main-tutorial__progress"
          aria-label={`개인연습 안내 ${stepIndex + 1}단계 중 ${PRACTICE_TUTORIAL_STEPS.length}단계`}
        >
          {PRACTICE_TUTORIAL_STEPS.map((tutorialStep, index) => (
            <span
              key={tutorialStep.id}
              className={
                index <= stepIndex
                  ? "main-tutorial__progress-dot main-tutorial__progress-dot--active"
                  : "main-tutorial__progress-dot"
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <p className="main-tutorial__eyebrow">{step.eyebrow}</p>
        <h2 id="practice-tutorial-title">{step.title}</h2>
        <p
          id="practice-tutorial-description"
          className="main-tutorial__description"
        >
          {step.description}
        </p>

        <div className="main-tutorial__footer">
          <button type="button" className="main-tutorial__skip" onClick={onClose}>
            건너뛰기
          </button>
          <div className="main-tutorial__navigation">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="main-tutorial__previous"
                onClick={() => setStepIndex((current) => current - 1)}
              >
                이전
              </button>
            ) : null}
            <button
              type="button"
              className="main-tutorial__next"
              onClick={() => {
                if (isLastStep) {
                  onClose();
                  return;
                }

                setStepIndex((current) => current + 1);
              }}
            >
              {isLastStep ? "연습 시작" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
