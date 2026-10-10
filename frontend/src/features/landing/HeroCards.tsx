import { Link } from 'react-router-dom'
import styles from './HeroCards.module.css'

/** The three fanned example cards of the landing hero: a birthday card, an invitation and a thank-you card. */
export function HeroCards() {
  return (
    <div className={styles.fan}>
      <svg width="0" height="0" className={styles.defs} aria-hidden="true">
        <defs>
          <symbol id="hero-daisy" viewBox="-30 -30 60 60">
            <g fill="#fffdf8" stroke="#2b1c17" strokeWidth="2.2">
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <ellipse key={angle} cx="0" cy="-15" rx="7" ry="13" transform={`rotate(${angle})`} />
              ))}
            </g>
            <circle r="7" fill="#ffd36e" stroke="#2b1c17" strokeWidth="2.2" />
          </symbol>
          <symbol id="hero-leaf" viewBox="0 0 40 20">
            <path d="M2 10 C 12 0, 28 0, 38 10 C 28 20, 12 20, 2 10 Z M2 10 H 30" fill="#8fd3b2" stroke="#2b1c17" strokeWidth="2" />
          </symbol>
        </defs>
      </svg>
      <ul className={styles.art}>
        <li className={styles.left}>
          <Link to="/templates" className={styles.link} aria-label="A birthday card — browse templates">
            <BirthdayCard />
            <span className={styles.caption}>a birthday card</span>
          </Link>
        </li>
        <li className={styles.middle}>
          <Link to="/templates" className={styles.link} aria-label="An invitation — browse templates">
            <InvitationCard />
            <span className={styles.caption}>an invitation</span>
          </Link>
        </li>
        <li className={styles.right}>
          <Link to="/templates" className={styles.link} aria-label="A thank-you card — browse templates">
            <ThankYouCard />
            <span className={styles.caption}>a thank-you card</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}

function BirthdayCard() {
  return (
    <span className={`${styles.card} ${styles.birthday}`} aria-hidden="true">
      <svg className={styles.drawing} viewBox="0 0 250 370">
        <g strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M30 140 l8 -6" stroke="#7a64e0" />
          <path d="M212 120 l-7 -7" stroke="#ff8fa6" />
          <path d="M40 230 q6 -8 12 0" stroke="#6fbf98" />
          <path d="M200 210 q6 -8 12 0" stroke="#7a64e0" />
          <path d="M224 300 l-6 7" stroke="#6fbf98" />
          <path d="M22 300 l7 5" stroke="#ff8fa6" />
        </g>
        <circle cx="60" cy="118" r="4" fill="#ff8fa6" />
        <circle cx="190" cy="150" r="5" fill="#6fbf98" />
        <circle cx="28" cy="190" r="3.5" fill="#7a64e0" />
        <circle cx="222" cy="250" r="4" fill="#ff8fa6" />
        <circle cx="185" cy="96" r="3" fill="#7a64e0" />
        <g transform="translate(19 8) scale(.85)">
          <g stroke="#2b1c17" strokeWidth="2.6" strokeLinejoin="round">
            <ellipse cx="125" cy="318" rx="84" ry="10" fill="#fffdf8" />
            <rect x="55" y="248" width="140" height="66" rx="12" fill="#ffc9d3" />
            <path d="M55 262 q0 -14 12 -14 h116 q12 0 12 14 q-10 10 -20 0 q-10 12 -22 0 q-10 12 -22 0 q-10 12 -22 0 q-10 12 -22 0 q-10 12 -22 0 q-6 6 -10 0 z" fill="#fffdf8" />
            <rect x="78" y="196" width="94" height="56" rx="12" fill="#c9bcff" />
            <path d="M78 210 q0 -14 12 -14 h70 q12 0 12 14 q-8 9 -16 0 q-9 10 -18 0 q-9 10 -18 0 q-9 10 -18 0 q-7 7 -12 0 z" fill="#fffdf8" />
            <rect x="98" y="164" width="9" height="32" rx="3" fill="#fffdf8" />
            <rect x="121" y="158" width="9" height="38" rx="3" fill="#fffdf8" />
            <rect x="144" y="164" width="9" height="32" rx="3" fill="#fffdf8" />
            <path d="M102.5 160 c -7 -8 -2 -16 0 -20 c 2 4 7 12 0 20 z" fill="#ffb35c" strokeWidth="2" />
            <path d="M125.5 154 c -7 -8 -2 -16 0 -20 c 2 4 7 12 0 20 z" fill="#ffb35c" strokeWidth="2" />
            <path d="M148.5 160 c -7 -8 -2 -16 0 -20 c 2 4 7 12 0 20 z" fill="#ffb35c" strokeWidth="2" />
          </g>
          <g fill="#fffdf8">
            <circle cx="90" cy="290" r="4" />
            <circle cx="125" cy="296" r="4" />
            <circle cx="160" cy="290" r="4" />
          </g>
        </g>
      </svg>
      <span className={styles.birthdayCopy}>
        <span className={styles.birthdaySmall}>HAPPY</span>
        <span className={styles.birthdayBig}>Birthday</span>
      </span>
      <span className={styles.birthdayFoot}>make a wish!</span>
    </span>
  )
}

function InvitationCard() {
  return (
    <span className={`${styles.card} ${styles.invite}`} aria-hidden="true">
      <svg className={styles.drawing} viewBox="0 0 270 400">
        <path d="M40 180 C 40 90, 230 90, 230 180" fill="none" stroke="#fffdf8" strokeOpacity=".25" strokeWidth="2" strokeDasharray="4 7" />
        <g stroke="#2b1c17" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M100 150 q35 -30 70 0 v18 q0 28 -35 28 q-35 0 -35 -28 z" fill="#ffc9d3" />
          <path d="M170 152 q22 -2 24 18 q-10 2 -24 12" fill="none" />
          <path d="M100 160 q-22 -6 -26 -24 q14 4 26 12" fill="#ffc9d3" />
          <rect x="124" y="114" width="22" height="10" rx="5" fill="#ffe8a8" />
          <circle cx="135" cy="110" r="5" fill="#ffe8a8" />
        </g>
        <g fill="#fffdf8">
          <circle cx="122" cy="168" r="4" />
          <circle cx="136" cy="174" r="4" />
          <circle cx="150" cy="168" r="4" />
        </g>
        <use href="#hero-leaf" x="40" y="186" width="44" height="22" transform="rotate(-25 62 197)" />
        <use href="#hero-leaf" x="186" y="186" width="44" height="22" transform="rotate(205 208 197)" />
        <use href="#hero-daisy" x="30" y="172" width="44" height="44" />
        <use href="#hero-daisy" x="196" y="172" width="44" height="44" />
        <use href="#hero-daisy" x="62" y="96" width="30" height="30" />
        <use href="#hero-daisy" x="180" y="92" width="26" height="26" />
        <g fill="#ffe8a8">
          <circle cx="135" cy="72" r="3" />
          <circle cx="104" cy="82" r="2" />
          <circle cx="168" cy="80" r="2.5" />
        </g>
      </svg>
      <span className={styles.arch} />
      <span className={styles.inviteCopy}>
        <span className={styles.inviteHand}>you’re invited to a</span>
        <span className={styles.inviteBig}>
          Garden
          <br />
          <i>Tea Party</i>
        </span>
        <span className={styles.inviteMeta}>Sat · June 14 · 3 PM</span>
      </span>
    </span>
  )
}

function ThankYouCard() {
  return (
    <span className={`${styles.card} ${styles.thanks}`} aria-hidden="true">
      <svg className={styles.drawing} viewBox="0 0 250 370">
        <use href="#hero-daisy" x="-26" y="-20" width="110" height="110" />
        <use href="#hero-daisy" x="170" y="20" width="70" height="70" />
        <use href="#hero-daisy" x="176" y="270" width="104" height="104" />
        <use href="#hero-daisy" x="8" y="300" width="56" height="56" />
        <use href="#hero-leaf" x="150" y="290" width="44" height="22" transform="rotate(-30 172 301)" />
        <use href="#hero-leaf" x="62" y="44" width="40" height="20" transform="rotate(30 82 54)" />
        <g fill="none" stroke="#2b1c17" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
          <path d="M40 120 l6 6 M46 120 l-6 6" />
          <path d="M206 120 l6 6 M212 120 l-6 6" />
          <path d="M118 280 l6 6 M124 280 l-6 6" />
        </g>
      </svg>
      <span className={styles.thanksCopy}>
        <span className={styles.thanksBig}>
          thank
          <br />
          you
        </span>
        <span className={styles.thanksHand}>for being lovely ♥</span>
      </span>
    </span>
  )
}
