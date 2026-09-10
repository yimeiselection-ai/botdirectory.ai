import './styles.css';
import { mountWorkbench } from './workbench';

const root = document.querySelector('[data-wb-root]');
if (root instanceof HTMLElement) {
  mountWorkbench(root);
}
