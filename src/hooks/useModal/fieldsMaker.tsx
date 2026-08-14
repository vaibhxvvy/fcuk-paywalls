import { ReactNode } from "react";
import {
  SelectField,
  TextAreaField,
  type ModalConfig,
  type TextField,
} from "./types";
import { inputClass } from "../../components/ui/input";
import { selectClass } from "../../components/ui/select";

type ModalFieldValues = Record<string, string>;
type ModalUpdateField = (
  modalId: string,
  fieldName: string,
  value: string,
) => void;

const labelClass =
  "font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70";
const fieldClass = "flex flex-col gap-1.5";

function makeTextField(
  field: TextField,
  fieldValues: ModalFieldValues,
  updateField: (name: string, value: string) => void,
) {
  return (
    <>
      <label className={labelClass} htmlFor={field.name}>
        {field.label}
      </label>
      <input
        className={inputClass}
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        value={fieldValues[field.name] ?? field.value ?? ""}
        onChange={(event) => updateField(field.name, event.target.value)}
      />
    </>
  );
}

function makeURLField(
  field: TextField,
  fieldValues: ModalFieldValues,
  updateField: (name: string, value: string) => void,
) {
  return (
    <>
      <label className={labelClass} htmlFor={field.name}>
        {field.label}
      </label>
      <input
        className={inputClass}
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        title="Make sure to prefix with https://"
        pattern="https?://.+"
        value={fieldValues[field.name] ?? field.value ?? ""}
        onChange={(event) => updateField(field.name, event.target.value)}
      />
    </>
  );
}

function makeSelectField(
  field: SelectField,
  fieldValues: ModalFieldValues,
  updateField: (name: string, value: string) => void,
): ReactNode {
  if (typeof field.options === "function")
    throw new Error(
      "Select field with options of type async callback isn't supported yet.",
    );

  return (
    <>
      <label className={labelClass} htmlFor={field.name}>
        {field.label}
      </label>
      <select
        className={selectClass}
        id={field.name}
        name={field.name}
        required={field.required}
        value={fieldValues[field.name] ?? "invalid"}
        onChange={(event) => updateField(field.name, event.target.value)}
      >
        {Object.entries(field.options).map(([name, label]) => (
          <option key={name} value={name}>
            {label}
          </option>
        ))}
      </select>
    </>
  );
}

function makeTextAreaField(
  field: TextAreaField,
  fieldValues: ModalFieldValues,
  updateField: (name: string, value: string) => void,
) {
  return (
    <>
      <label className={labelClass} htmlFor={field.name}>
        {field.label}
      </label>
      <textarea
        className={`${inputClass} h-24 resize-y py-2.5`}
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        value={fieldValues[field.name] ?? ""}
        onChange={(event) => updateField(field.name, event.target.value)}
      />
    </>
  );
}

export function fieldsMaker(
  modalConfig: ModalConfig,
  modalFieldValues: ModalFieldValues,
  updateModalFieldValue: ModalUpdateField,
) {
  const activeFieldValues = modalFieldValues;

  let inputFields = modalConfig.pages.map((page) =>
    page.fields.map((field) => {
      const updateField = (name: string, value: string) =>
        updateModalFieldValue(modalConfig.modalId, name, value);

      switch (field.type) {
        case "text":
          return makeTextField(field, activeFieldValues, updateField);
        case "select":
          return makeSelectField(field, activeFieldValues, updateField);
        case "textarea":
          return makeTextAreaField(field, activeFieldValues, updateField);
        case "url":
          return makeURLField(field, activeFieldValues, updateField);
      }
    }),
  );

  return inputFields.flat().map((inputField, index) => (
    <div className={fieldClass} key={index}>
      {inputField}
    </div>
  ));
}