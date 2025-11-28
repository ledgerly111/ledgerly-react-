import { createElement, isValidElement } from 'react';
import { useAppActions, useAppState } from '../context/AppContext.jsx';

export default function ModalHost() {
  const { modal } = useAppState();
  const { closeModal } = useAppActions();

  if (!modal.open || !modal.content) {
    return null;
  }

  const { content, props } = modal;
  const { modalClassName, ...componentProps } = props || {};
  let resolvedContent = content;

  if (isValidElement(content)) {
    resolvedContent = content;
  } else if (typeof content === 'function') {
    resolvedContent = createElement(content, componentProps ?? {});
  }

  return (
    <div id="modal" className="modal-overlay" style={{ overflow: 'hidden' }}>
      <div className={`modal-content ${modalClassName || ''}`}>
        <button
          type="button"
          className="modal-close"
          onClick={() => closeModal()}
        >
          <i className="fas fa-times"></i>
        </button>
        {resolvedContent}
      </div>
    </div>
  );
}
