// src/app/(site)/disclaimer/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "免責事項 | life-tools.jp",
  description: "life-tools.jp の免責事項です。",
  robots: { index: true, follow: true },
};

export default function DisclaimerPage() {
  return (
    <div className="prose prose-slate max-w-3xl mx-auto">
      <h1>免責事項</h1>
      <p>最終更新日：2025年8月29日</p>

      <h2>1. 情報の正確性</h2>
      <p>
        当サイトの記事・ツールは正確な情報提供に努めていますが、内容の正確性・最新性・有効性を保証するものではありません。
        ご利用は自己責任にてお願いいたします。
      </p>

      <h2>2. 投資・金融・ライフプラン情報について</h2>
      <p>
        当サイトの情報やシミュレーション結果は一般的な参考情報であり、特定の投資勧誘・税務/法務等の助言を目的とするものではありません。
        重要な意思決定の前には必ず専門家にご相談ください。
      </p>

      <h2>3. 損害等の責任</h2>
      <p>
        当サイトの情報・ツールの利用により生じた損害やトラブルについて、当サイトは一切の責任を負いません。
      </p>

      <h2>4. 外部リンク</h2>
      <p>
        当サイトからの外部リンク先の内容について、当サイトは一切の責任を負いません。
        商品・サービスに関する問い合わせは各提供元へお願いします。
      </p>

      <h2>5. コンテンツの変更・公開停止</h2>
      <p>
        当サイトのコンテンツやURLは、予告なく変更・削除される場合があります。
      </p>

      <h2>6. 著作権</h2>
      <p>
        当サイト内の文章・画像・ツール等の著作権は当サイトまたは正当な権利者に帰属します。
        許可なく複製・転載・再配布することを禁じます。
      </p>

      <h2>7. お問い合わせ</h2>
      <p>
        本免責事項に関するお問い合わせは、
        <a href="/contact" className="text-indigo-600 underline hover:text-indigo-800">
            お問い合わせフォーム
        </a>
        よりお願いいたします。
    　</p>

    </div>
  );
}
