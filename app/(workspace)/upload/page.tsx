import { CallDataUploadPanel } from "@/components/call-data-upload-panel";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import {
  acceptedAudioFormats,
  uploadProcessingGuidance
} from "@/data/mock-platform-data";

export default function UploadPage() {
  return (
    <main>
      <WorkspacePageHeader
        title="Upload Call Data"
        description="Upload recent call recordings to identify conversion failures and revenue leakage."
      />

      <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-5 xl:grid-cols-[minmax(0,1.18fr)_340px] xl:items-start">
        <CallDataUploadPanel />

        <aside className="space-y-4 sm:space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
          <section className="surface-secondary p-4 sm:p-5">
            <h3 className="type-section-title text-[18px]">Accepted Audio Formats</h3>
            <div className="mt-4 space-y-3 text-[14px] text-[#6B7280]">
              {acceptedAudioFormats.map((entry) => (
                <div key={entry} className="surface-primary px-4 py-3">
                  {entry}
                </div>
              ))}
            </div>
          </section>

          <section className="surface-secondary p-4 sm:p-5">
            <h3 className="type-section-title text-[18px]">Upload Processing Guidance</h3>
            <div className="mt-4 space-y-3">
              {uploadProcessingGuidance.map((item) => (
                <div key={item} className="surface-primary type-body-text px-4 py-3 text-[14px]">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
