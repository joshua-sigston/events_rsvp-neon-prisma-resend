import React from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'

interface InputFieldProps<T extends FieldValues> {
    name: Path<T>,
    placeholder: string,
    label: string,
    control: Control<T>
    type?: React.HTMLInputTypeAttribute
}

export default function InputField<T extends FieldValues>({ name, placeholder, label, control, type = "text" }: InputFieldProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`form-field-${name}`} className="text-lg font-bold">
                        {label}
                    </FieldLabel>
                    <Input
                        {...field}
                        id={`form-field-${name}`}
                        type={type}
                        aria-invalid={fieldState.invalid}
                        placeholder={placeholder}
                        autoComplete="off"
                    />
                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />
    )
}