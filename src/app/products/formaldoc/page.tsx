import SectionWrapper from '@/components/ui/SectionWrapper';
import styles from '@/components/products/ProductLayout.module.css';
import Button from '@/components/ui/Button';

export default function FormalDocPage() {
  return (
    <>
      <SectionWrapper className={styles.heroSection}>
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>Intelligent Documentation</span>
          <h1 className={styles.heroTitle}>
            Enterprise Standards,<br />
            Codified by AI.
          </h1>
          <p className={styles.heroSubtitle}>
            FormalDoc 是文件模板的建構系統。上傳您的企業標準 Docx 檔案，我們將其轉化為 AI 可讀、可寫的嚴謹樣板。並進一步生成 MCP Server，讓所有 AI 產出都符合最高規範。
          </p>
          <div style={{ marginTop: '48px' }}>
            <Button size="lg" href="/contact">Standardize Now</Button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.assertionSection}>
        <div className={styles.assertionWrapper}>
          <h2 className={styles.assertionTitle}>從「範文」走向「規範」</h2>
          <p className={styles.assertionText}>
            企業深受文件格式混亂之苦。FormalDoc 不只是生成文字，而是鎖定「結構」。
            透過逆向工程您的現有文件，我們提取出隱性的排版規則與邏輯，封裝成 AI 工具。從此，每一次的輸出都是完美的 100 分。
          </p>
        </div>
      </SectionWrapper>

      <SectionWrapper className={styles.stepsSection}>
        <div className={styles.stepsHeader}>
          <h2 className={styles.stepsTitle}>Standardization Process</h2>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>01</span>
            <h3 className={styles.stepTitle}>Template Ingestion</h3>
            <p className={styles.stepDesc}>
              上傳範本，立即解析。無論是採購合約、技術白皮書還是季報，FormalDoc 能深度解析其中的樣式、變數與段落結構。您也可以從我們的標準樣板庫中直接下載使用。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Docx file being scanned and broken down into structure blocks ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>02</span>
            <h3 className={styles.stepTitle}>MCP Generation</h3>
            <p className={styles.stepDesc}>
              將樣板轉化為工具 (Tool)。FormalDoc 會自動產對應的 MCP Server 代碼。這意味著您可以直接命令 Ryko：「使用『採購合約樣板』生成一份草稿」，無需再次調教格式。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Template block transforming into a code block/API icon ]
          </div>
        </div>

        <div className={styles.stepItem}>
          <div className={styles.stepContent}>
            <span className={styles.stepNumber}>03</span>
            <h3 className={styles.stepTitle}>Collaborative Refinement</h3>
            <p className={styles.stepDesc}>
              人機協作精修。生成的模板並非死板不可改，您可以在 FormalDoc 平台上與 AI 協作調整定義。確保每一個欄位、每一個條款都精確符合當下的業務需求。
            </p>
          </div>
          <div className={styles.stepVisual}>
            [ Visual: Users and AI cursor editing a document together ]
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
