import { JOURNEY } from '../lib/content';
import { LandingSection, LandingSectionHeading } from './section';

/**
 * The order journey, rendered as a timeline rail (docs/frontend-design-
 * direction.md) rather than a status table — the same model buyers follow
 * after signing in.
 */
export function LandingHowItWorks() {
  return (
    <LandingSection id="how-it-works" className="bg-[#FBF7EE]">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <LandingSectionHeading
          index="02"
          eyebrow="How it works"
          title="One order, farm gate to delivery"
          description="Every trade follows the same tracked journey — discover, reserve, accept, pay, transport and deliver. Buyers and cooperatives see the same truth at every step."
        />

        <ol className="journey">
          {JOURNEY.map((step, index) => (
            <li
              key={step.title}
              className="journey__step"
              data-state={index === JOURNEY.length - 1 ? 'current' : 'done'}
            >
              <span className="journey__marker" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="journey__label">{step.title}</p>
                <p className="journey__desc">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </LandingSection>
  );
}
