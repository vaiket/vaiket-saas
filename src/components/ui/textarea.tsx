import * as React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
