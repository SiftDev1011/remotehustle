import {
  LoadingPage,
  CrumbBone,
  HeadingBone,
  Bone,
} from "@/components/skeletons/primitives";
export default function FaqLoading() {
  return (
    <LoadingPage
      className="rm-page rm-shell rm-narrow"
      label="frequently asked questions"
    >
      <CrumbBone />
      <HeadingBone description={false} />
      <div className="app-faq-list">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="app-faq-item" key={i}>
            <Bone width="85%" height={48} />
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}
