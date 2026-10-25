import React from 'react';
import useConfirmStore from '@/store/useConfirmStore';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmHost = () => {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  return (
    <Modal
      isOpen={Boolean(request)}
      onClose={() => settle(false)}
      title={request?.title || 'Are you sure?'}
      size="sm"
      labelledBy="confirm-title"
      footer={(
        <>
          <Button variant="ghost" onClick={() => settle(false)}>{request?.cancelLabel || 'Cancel'}</Button>
          <Button variant={request?.tone === 'danger' ? 'primary' : 'accent'} onClick={() => settle(true)}>
            {request?.confirmLabel || 'Confirm'}
          </Button>
        </>
      )}
    >
      <p className="text-sm text-ink/80">{request?.message}</p>
    </Modal>
  );
};
