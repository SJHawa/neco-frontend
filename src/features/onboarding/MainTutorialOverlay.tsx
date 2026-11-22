import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MAIN_TUTORIAL_STEPS } from "./mainTutorial";

type SpotlightLayout = {
  highlight: CSSProperties;
  card: CSSProperties;
} | null;

const HIGHLIGHT_PADDING = 8;
const CARD_GAP = 18;
const CARD_MAX_WIDTH = 380;
const CARD_ESTIMATED_HEIGHT = 245;
const VIEWPORT_MARGIN = 16;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function getSpotlightLayout(target: Element): SpotlightLayout {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(CARD_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
  const highlightLeft = Math.max(VIEWPORT_MARGIN, rect.left - HIGHLIGHT_PADDING);
  const highlightTop = Math.max(VIEWPORT_MARGIN, rect.top - HIGHLIGHT_PADDING);
  const highlightRight = Math.min(viewportWidth - VIEWPORT_MARGIN, rect.right + HIGHLIGHT_PADDING);
  const highlightBottom = Math.min(viewportHeight - VIEWPORT_MARGIN, rect.bottom + HIGHLIGHT_PADDING);

  let cardLeft = clamp(
    rect.left + rect.width / 2 - cardWidth / 2,
    VIEWPORT_MARGIN,
    viewportWidth - cardWidth - VIEWPORT_MARGIN,
  );
  let cardTop = rect.bottom + CARD_GAP;

  if (viewportWidth - rect.right >= cardWidth + CARD_GAP + VIEWPORT_MARGIN) {
    cardLeft = rect.right + CARD_GAP;
    cardTop = clamp(
      rect.top,
      VIEWPORT_MARGIN,
      viewportHeight - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN,
    );
  } else if (rect.left >= cardWidth + CARD_GAP + VIEWPORT_MARGIN) {
    cardLeft = rect.left - cardWidth - CARD_GAP;
    cardTop = clamp(
      rect.top,
      VIEWPORT_MARGIN,
      viewportHeight - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN,
    );
  } else if (rect.bottom + CARD_GAP + CARD_ESTIMATED_HEIGHT > viewportHeight - VIEWPORT_MARGIN) {
    cardTop = rect.top - CARD_GAP - CARD_ESTIMATED_HEIGHT;
  }

  cardTop = clamp(
    cardTop,
    VIEWPORT_MARGIN,
    viewportHeight - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN,
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

export function MainTutorialOverlay({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<SpotlightLayout>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const step = MAIN_TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === MAIN_TUTORIAL_STEPS.length - 1;

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
      if (event.key === "Tab") {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) {
          event.preventDefault();
          dialogRef.current?.focus();
          return;
        }

        if (event.shiftKey && (document.activeElement === firstElement || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }

      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((current) => current - 1);
      }

      if (event.key === "ArrowRight" && !isLastStep) {
        setStepIndex((current) => current + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLastStep, onClose, stepIndex]);

  return (
    <div className={`main-tutorial${layout ? "" : " main-tutorial--centered"}`}>
      <div className="main-tutorial__interaction-blocker" aria-hidden="true" />
      {layout ? (
        <div className="main-tutorial__spotlight" style={layout.highlight} aria-hidden="true" />
      ) : null}

      <div
        ref={dialogRef}
        className="main-tutorial__card"
        style={layout?.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="main-tutorial-title"
        aria-describedby="main-tutorial-description"
        tabIndex={-1}
      >
        <div
          className="main-tutorial__progress"
          aria-label={`튜토리얼 ${stepIndex + 1}단계 중 ${MAIN_TUTORIAL_STEPS.length}단계`}
        >
          {MAIN_TUTORIAL_STEPS.map((tutorialStep, index) => (
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
        <h2 id="main-tutorial-title">{step.title}</h2>
        <p id="main-tutorial-description" className="main-tutorial__description">
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
              {isLastStep ? "시작하기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
