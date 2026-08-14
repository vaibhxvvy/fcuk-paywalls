import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { fieldsMaker } from "./fieldsMaker";
import type { ModalConfig } from "./types";
import { Button } from "../../components/ui/button";
import { DialogOverlay, DialogPanel } from "../../components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

type showModalFields = (
  modalID: string | undefined,
  populatedFields?: Record<string, string>,
) => void;
type ModalFieldValues = Record<string, string>;

interface ModalController {
  showModalWithID: showModalFields;
}

const ReportContext = createContext<ModalController | undefined>(undefined);

export function useModal() {
  const context = useContext(ReportContext);

  if (!context) {
    throw new Error("useModal must be used inside a ModalProvider");
  }

  return context;
}

type ModalStatus = "idle" | "loading" | "success" | "failure";

function ModalRenderer({
  modalConfig,
  initialFieldValues,
  saveFieldValues,
}: {
  modalConfig: ModalConfig;
  initialFieldValues: ModalFieldValues;
  saveFieldValues: (modalId: string, values: ModalFieldValues) => void;
}) {
  const { showModalWithID } = useModal();
  const [modalStatus, setModalStatus] = useState<ModalStatus>("idle");
  const [modalFieldValues, setModalFieldValues] =
    useState<ModalFieldValues>(initialFieldValues);

  const modalInputFields = fieldsMaker(
    modalConfig,
    modalFieldValues,
    (_modalId, fieldName, value) => {
      setModalFieldValues((current) => ({
        ...current,
        [fieldName]: value,
      }));
    },
  );

  function closeModal() {
    saveFieldValues(modalConfig.modalId, modalFieldValues);
    showModalWithID(undefined);
    setModalStatus("idle");
  }

  return (
    <DialogOverlay onClick={closeModal}>
      <DialogPanel onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
              [ FORM_{modalConfig.modalId.replace("-", "_").toUpperCase()} ]
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
              {modalConfig.modalTitle}
            </h2>
          </div>
          <button
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-ink bg-surface transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-x-[2px] active:translate-y-[2px]"
            onClick={closeModal}
            aria-label={`Close ${modalConfig.modalId.replace("-", " ")} modal`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {modalStatus === "idle" ? (
          <form
            onSubmit={(e) =>
              handleSubmit(e, setModalStatus, modalConfig.submitURL)
            }
            method="post"
            className="flex flex-col gap-4"
            id="modal-engine-form"
          >
            {modalInputFields}
            <Button type="submit" className="mt-1 self-start uppercase">
              Send it
            </Button>
          </form>
        ) : modalStatus === "success" ? (
          <div className="flex flex-col items-start gap-3">
            <Alert variant="success" className="w-full">
              <AlertTitle>Received.</AlertTitle>
              <AlertDescription>
                We&apos;ll review it and get back to you shortly.
              </AlertDescription>
            </Alert>
            <Button variant="secondary" onClick={closeModal} className="uppercase">
              Close
            </Button>
          </div>
        ) : modalStatus === "failure" ? (
          <div className="flex flex-col items-start gap-3">
            <Alert variant="error" className="w-full">
              <AlertTitle>The wall won.</AlertTitle>
              <AlertDescription>
                Encountered an error while submitting. Try again — or
                check your connection.
              </AlertDescription>
            </Alert>
            <Button
              variant="primary"
              onClick={() => setModalStatus("idle")}
              className="uppercase"
            >
              Try again
            </Button>
          </div>
        ) : (
          <p className="font-mono text-sm font-bold uppercase tracking-widest">
            Sending<span className="cursor-blink">_</span>
          </p>
        )}
      </DialogPanel>
    </DialogOverlay>
  );
}

export function ModalProvider({
  children,
  modalConfigs,
}: {
  children: ReactNode;
  modalConfigs: ModalConfig[];
}) {
  const [requestedModalConfig, setRequestedModalConfig] = useState<
    ModalConfig | undefined
  >(undefined);
  const modalFieldValuesRef = useRef<Record<string, ModalFieldValues>>({});

  function showModalWithID(
    modalID: string | undefined,
    populatedFields?: Record<string, string>,
  ) {
    const requestedModalConfig = modalConfigs.find(
      (modalConfig) => modalConfig.modalId === modalID,
    );

    if (requestedModalConfig === undefined && modalID !== undefined)
      console.warn(
        `Attempted to open a modal with id that doesn't exist. Modal_ID requested: ${modalID}`,
      );

    if (
      modalID !== undefined &&
      requestedModalConfig !== undefined &&
      populatedFields !== undefined
    ) {
      modalFieldValuesRef.current[modalID] = {
        ...(modalFieldValuesRef.current[modalID] ?? {}),
        ...populatedFields,
      };
    }

    setRequestedModalConfig(requestedModalConfig);
  }

  function saveFieldValues(modalId: string, values: ModalFieldValues) {
    modalFieldValuesRef.current[modalId] = values;
  }

  const activeFieldValues = requestedModalConfig
    ? (modalFieldValuesRef.current[requestedModalConfig.modalId] ?? {})
    : {};

  return (
    <ReportContext.Provider value={{ showModalWithID }}>
      {children}
      {requestedModalConfig && (
        <ModalRenderer
          modalConfig={requestedModalConfig}
          initialFieldValues={activeFieldValues}
          saveFieldValues={saveFieldValues}
        />
      )}
    </ReportContext.Provider>
  );
}

async function handleSubmit(
  e: FormEvent,
  setModalStatus: (status: ModalStatus) => void,
  submitURL: string,
) {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  const formProps = Object.fromEntries(formData);

  setModalStatus("loading");

  const response = await fetch(submitURL, {
    method: "POST",
    body: JSON.stringify(formProps),
  });

  response.ok ? setModalStatus("success") : setModalStatus("failure");
}