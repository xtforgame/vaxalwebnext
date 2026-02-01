import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import styles from './brevflow.module.css';
import { GitBranch, Mail, Database, Users } from 'lucide-react';

const USE_CASES = [
  {
    icon: <GitBranch />,
    title: '銷售漏斗自動化',
    desc: '從潛在客戶進入 CRM，到 AI 自動分類、郵件觸發、資料同步、通知提醒，一氣呵成。讓業務團隊專注於成交，而非瑣碎的流程追蹤。',
    example: 'Trigger: New Lead → AI Classify → Send Welcome Email → Update CRM → Notify Sales'
  },
  {
    icon: <Users />,
    title: '員工入職自動化',
    desc: '新員工加入後，自動建立帳號、分配權限、發送歡迎信、安排培訓日程。HR 只需要審核，系統會完成 90% 的重複性工作。',
    example: 'Trigger: HR Approval → Create Accounts (Slack, Gmail, etc.) → Assign Permissions → Send Onboarding Kit'
  },
  {
    icon: <Mail />,
    title: '智能客服工作流',
    desc: '客戶來信自動分類優先級、提取需求、查詢 FAQ、轉工單、追蹤進度。AI 處理簡單詢問，複雜問題無縫轉人工。',
    example: 'Email → AI Extract Intent → Match FAQ or Create Ticket → Auto-reply or Escalate'
  },
  {
    icon: <Database />,
    title: '跨平台資料同步',
    desc: '訂單從電商平台進入後，自動同步至 ERP、通知物流、更新庫存、發送追蹤碼給客戶。真正實現全域資料的即時一致性。',
    example: 'Order Placed → Sync to ERP → Update Inventory → Notify Logistics → Send Tracking to Customer'
  }
];

export default function BrevFlowPage() {
  return (
    <div className={styles.brevflowPage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <SectionWrapper>
          <span className={styles.badge}>AI-Native Workflow Engine</span>
          <h1 className={styles.title}>BrevFlow: Automate Everything</h1>
          <p className={styles.subtitle}>
            不再是「寫程式自動化」，而是「用 AI 描述需求就能自動化」。BrevFlow 讓您用自然語言設計工作流，AI 負責跨平台串接與資料轉譯。
          </p>
          <div className={styles.ctaGroup} style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Button size="lg" href="/contact">Request Demo</Button>
            <Button variant="outline" size="lg" href="/docs/brevflow">View Docs</Button>
          </div>
        </SectionWrapper>
      </section>

      {/* Use Cases */}
      <section className={styles.useCasesSection}>
        <SectionWrapper>
          <h2 className={styles.sectionTitle}>From Chaos to Clarity</h2>
          <div className={styles.useCaseGrid}>
            {USE_CASES.map((useCase, idx) => (
              <div key={idx} className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>{useCase.icon}</div>
                <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
                <p className={styles.useCaseDesc}>{useCase.desc}</p>
                <div className={styles.useCaseExample}>{useCase.example}</div>
              </div>
            ))}
          </div>

          <div className={styles.flowVisual}>
            [ Interactive Flow Builder UI ]<br/>
            Drag & Drop nodes: Triggers → AI Processing → API Calls → Notifications
          </div>
        </SectionWrapper>
      </section>

      {/* Final CTA */}
      <SectionWrapper style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>讓 AI 成為您的自動化工程師</h2>
        <p style={{ color: 'var(--muted-text)', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
          從第一個簡單工作流開始，逐步建立企業級的 AI 驅動自動化網絡。
        </p>
        <Button size="lg" href="/contact">Start Your Automation Journey</Button>
      </SectionWrapper>
    </div>
  );
}
