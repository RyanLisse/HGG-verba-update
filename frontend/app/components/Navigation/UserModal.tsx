'use client';

import type React from 'react';

type UserModalComponentProps<T = unknown> = {
  modal_id: string;
  title: string;
  text: string;
  triggerAccept?: null | ((value: T) => void);
  triggerValue?: T | null;
  triggerString?: string | null;
};

import VerbaButton from './VerbaButton';

const UserModalComponent: React.FC<UserModalComponentProps> = ({
  title,
  modal_id,
  text,
  triggerAccept,
  triggerString,
  triggerValue,
}) => {
  return (
    <dialog className="modal" id={modal_id}>
      <div className="modal-box flex flex-col gap-2">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="whitespace-pre-wrap">{text}</p>
        <div className="modal-action">
          <form className="flex gap-2" method="dialog">
            {triggerAccept && triggerString && (
              <VerbaButton
                onClick={() => {
                  triggerAccept(triggerValue);
                }}
                title={triggerString}
                type="submit"
              />
            )}
            <VerbaButton
              selected={true}
              selected_color="bg-warning-verba"
              title="Cancel"
              type="submit"
            />
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default UserModalComponent;
