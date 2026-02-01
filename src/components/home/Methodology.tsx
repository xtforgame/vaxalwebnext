import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from './Methodology.module.css';

const STEPS = [
  {
    number: 'Step 01',
    title: 'Connect (Pilot)',
    description: '從痛點出發的無痛搶灘。透過 Ryko Agent 解決單點痛點，無需大型基建即可驗證 AI 價值。快速部署，即時見效。',
    visual: 'Interaction Demo: User Question -> AI Agent Response'
  },
  {
    number: 'Step 02',
    title: 'Automate (Scale)',
    description: '將單點連結成線。使用 BrevFlow 串接全域資料與跨部門工作流，將重複性勞動轉化為 AI 自動化流水線。',
    visual: 'Workflow Visual: Data Flow between different platforms'
  },
  {
    number: 'Step 03',
    title: 'Govern (Manage)',
    description: '實現企業級智能治理。導入 SoloistBoard，讓 AI 不僅是執行者，更是專案主動推進器，確保規模化維運的絕對可控。',
    visual: 'Dashboard View: AI Managing multiple tasks and cards'
  }
];

export default function Methodology() {
  return (
    <SectionWrapper background="grey" className={styles.methodSection} id="methodology">
      <div className={styles.header}>
        <h2 className={styles.title}>The Vaxal Method</h2>
        <p className={styles.subtitle}>
          技術的力量應立竿見影。我們透過由易入難的三部曲架構，確保每一個發展階段都能交付可量化的價值。
        </p>
      </div>
      
      <div className={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <div key={index} className={styles.stepItem}>
            <div className={styles.stepContent}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
            <div className={styles.visualPlaceholder}>
              [ {step.visual} ]
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
