import { useState, useCallback } from 'react';

interface Options {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<Options>({ title: '', message: '' });
  const [resolve, setResolve] = useState<(v: boolean) => void>(() => () => {});

  const confirm = useCallback((options: Options): Promise<boolean> => {
    return new Promise(res => {
      setOpts(options);
      setResolve(() => res);
      setOpen(true);
    });
  }, []);

  const handleConfirm = () => { setOpen(false); resolve(true); };
  const handleCancel  = () => { setOpen(false); resolve(false); };

  return { confirm, confirmProps: { open, ...opts, onConfirm: handleConfirm, onCancel: handleCancel } };
}
