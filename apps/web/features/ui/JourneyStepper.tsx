export type JourneyState = 'done' | 'current' | 'todo' | 'error';

export type JourneyStep = {
  label: string;
  state: JourneyState;
  description?: string;
  timestamp?: string;
};

type JourneyStepperProps = {
  steps: JourneyStep[];
  /** Aria label for the progression, e.g. "Order #12 journey". */
  label: string;
};

/** The order journey as progression (timeline), never as a status table. */
export function JourneyStepper({ steps, label }: JourneyStepperProps) {
  return (
    <ol className="journey" aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.label} className="journey__step" data-state={step.state}>
          <span className="journey__marker" aria-hidden="true">
            {step.state === 'done' ? '✓' : step.state === 'error' ? '!' : index + 1}
          </span>
          <div>
            <p className="journey__label">{step.label}</p>
            {step.description ? (
              <p className="journey__desc">{step.description}</p>
            ) : null}
            {step.timestamp ? (
              <time className="journey__time">{step.timestamp}</time>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
