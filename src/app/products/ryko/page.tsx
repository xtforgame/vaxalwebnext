import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './ryko.module.css';
import { Shield, Zap, Cpu, Layers, Database, Globe } from 'lucide-react';

const FEATURES = [
  {
    icon: <Cpu />,
    title: 'Precision Dispatching',
    desc: 'AI 代理人的大腦。精準偵測意圖並調度最適合的企業內部工具與微服務。'
  },
  {
    icon: <Shield />,
    title: 'Secure Sandbox',
    desc: '在隔離環境中執行 AI 生成的腳本與指令，確保企業核心資料與基建的絕對安全。'
  },
  {
    icon: <Database />,
    title: 'Context Engine',
    desc: '從 Vector DB 到 SQL，Ryko 為 AI 提供即時且精準的業務脈絡，消除幻覺。'
  },
  {
    icon: <Zap />,
    title: 'Ultra-low Latency',
    desc: '針對 AI 推理場景優化的微服務架構，確保 Agent 在毫秒級內做出反應。'
  },
  {
    icon: <Layers />,
    title: 'MCP Ready',
    desc: '全面支援 Model Context Protocol。無縫接入第三方工具生態系，擴展 AI 能力邊界。'
  },
  {
    icon: <Globe />,
    title: 'Enterprise Ready',
    desc: '具備完善的日誌、權限管控與可觀測性，讓 AI 的每一次行動都透明可查。'
  }
];

export default function RykoPage() {
  return (
    <div className={styles.rykoPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <SectionWrapper>
          <span className={styles.badge}>Next-Gen AI Component</span>
          <h1 className={styles.title}>Ryko: AI Core Runtime</h1>
          <p className={styles.subtitle}>
            不只是 API，而是 AI 代理人的作業系統。Ryko 為您的企業建構了一個具備安全性、可擴展性與深度工具連接能力的 AI 核心運行環境。
          </p>
          <div className={styles.ctaGroup} style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Button size="lg" href="/contact">Request Demo</Button>
            <Button variant="outline" size="lg" href="/docs/ryko">View Specs</Button>
          </div>
        </SectionWrapper>
      </section>

      {/* Features Grid */}
      <SectionWrapper>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Architecture Visual */}
      <section className={styles.archSection}>
        <SectionWrapper>
          <h2 className={styles.archTitle}>Bridging the Gap: AI x Enterprise Data</h2>
          <div className={styles.archVisual}>
            [ Architecture Diagram: LLM {'->'} Ryko Runtime {'->'} (Internal DB / CRM / Custom APIs) ]<br/>
            Visualizing the secure bridge and tool dispatching layers.
          </div>
        </SectionWrapper>
      </section>

      {/* Final CTA */}
      <SectionWrapper style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>Build Your First Agent with Ryko</h2>
        <p style={{ color: 'var(--muted-text)', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
          加入 Vaxal 的試點計畫，在您的私有環境中體驗 Ryko 帶來的強大 AI 工具調度能力。
        </p>
        <Button size="lg" href="/contact">Start Pilot Program</Button>
      </SectionWrapper>
    </div>
  );
}
