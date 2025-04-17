
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    validate?: (value: any) => boolean | string;
  }
}

interface FormErrors {
  [key: string]: string;
}

export function useFormValidation<T extends Record<string, any>>(validationRules: ValidationRules) {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((name: string, value: any): string => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && !value) {
      return `${name} is required`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return `${name} format is invalid`;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `${name} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${name} must not exceed ${rules.maxLength} characters`;
    }

    if (rules.validate) {
      const result = rules.validate(value);
      if (typeof result === 'string') return result;
      if (!result) return `${name} is invalid`;
    }

    return '';
  }, [validationRules]);

  const validateForm = useCallback((data: T): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      toast.error("Please fix the form errors before submitting");
    }

    return isValid;
  }, [validateField, validationRules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateForm,
    validateField,
    clearErrors,
  };
}
