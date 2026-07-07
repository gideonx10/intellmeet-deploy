import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function RecordingConfirmDialogs({
  showStartConfirm,
  onShowStartConfirmChange,
  showStopConfirm,
  onShowStopConfirmChange,
  onConfirmStart,
  onConfirmStop,
}: {
  showStartConfirm: boolean;
  onShowStartConfirmChange: (open: boolean) => void;
  showStopConfirm: boolean;
  onShowStopConfirmChange: (open: boolean) => void;
  onConfirmStart: () => void;
  onConfirmStop: () => void;
}) {
  return (
    <>
      <Dialog open={showStartConfirm} onOpenChange={onShowStartConfirmChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start recording this meeting?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mb-6">
            A small recording window will open. When Chrome asks what to share, pick "Chrome Tab" and
            select this meeting's tab.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onShowStartConfirmChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onShowStartConfirmChange(false);
                onConfirmStart();
              }}
            >
              Start Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showStopConfirm} onOpenChange={onShowStopConfirmChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop and save this recording?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onShowStopConfirmChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onShowStopConfirmChange(false);
                onConfirmStop();
              }}
            >
              Stop Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
