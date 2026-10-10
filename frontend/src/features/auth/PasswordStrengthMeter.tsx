import { Check, Circle } from 'lucide-react'
import { evaluatePassword } from './password'
import styles from './PasswordStrengthMeter.module.css'

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = evaluatePassword(password)
  return (
    <div className={styles.root}>
      <div className={styles.bar} role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} aria-valuetext={password ? strength.label : 'Empty'} data-score={strength.score}>
        {[1, 2, 3, 4].map((segment) => (
          <span key={segment} className={styles.segment} data-active={strength.score >= segment || undefined} />
        ))}
      </div>
      <p className={styles.label} aria-live="polite">
        {password ? strength.label : 'Use 8+ characters with a mix of letters, numbers or symbols.'}
      </p>
      <ul className={styles.rules}>
        {strength.checks.map((check) => (
          <li key={check.id} className={styles.rule} data-passed={check.passed || undefined}>
            {check.passed ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
            <span>{check.label}</span>
            <span className={styles.srOnly}>{check.passed ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
