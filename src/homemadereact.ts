type ReactElement = ReactComponentElement | ReactHTMLElement | ReactTextElement;

type Children = ReactElement[];

type Props = {
  children?: Children;
  [key: string]: any;
};

type ReactComponentElement = {
  type: 'ReactComponentElement';
  componentRenderFunction: (props: Props) => Children;
  props: Props;
  stateHooks: [value: any, setValue: (value: any | ((val: any) => any)) => void][];
  effectHooks: {
    cleanup?: () => void;
    callback: () => void | (() => void);
    dependencies?: any[];
  }[];
};

type ReactHTMLElement = {
  type: 'ReactHTMLElement';
  tag: string;
  props: Props;
};

type ReactTextElement = string;

type ReactNode = {
  element: ReactElement;
  parentNode: ReactNode | null;
  childNodes: ReactNode[] | null;
  domNode: HTMLElement | null;
};

let rootElementNode: ReactNode | undefined;

let _currentNode: ReactNode | null = null;
let _stateHookIndex = 0;
let _effectHookIndex = 0;

const EFFECT_RUN_TIMEOUT = 100;

function isTextElement(element: ReactElement): element is ReactTextElement {
  return typeof element === 'string';
}

function isHTMLElement(element: ReactElement): element is ReactHTMLElement {
  return (element as ReactHTMLElement).type === 'ReactHTMLElement';
}

function isComponentElement(
  element: ReactElement
): element is ReactComponentElement {
  return (element as ReactComponentElement).type === 'ReactComponentElement';
}

function createElement(
  componentOrTag: string | ReactComponentElement['componentRenderFunction'],
  props: Props | null,
  ...children: Children
): ReactComponentElement | ReactHTMLElement {
  if (typeof componentOrTag === 'string') {
    const element: ReactHTMLElement = {
      type: 'ReactHTMLElement',
      tag: componentOrTag,
      props: { ...props, children: children || [] },
    };
    return element;
  } else {
    const element: ReactComponentElement = {
      type: 'ReactComponentElement',
      componentRenderFunction: componentOrTag,
      props: { ...props, children: children || [] },
      stateHooks: [],
      effectHooks: [],
    };

    return element;
  }
}

export const _jsx_createElement = createElement;

const isEvent = (key: string): boolean => !!key.match(new RegExp('on[A-Z].*'));

const eventToKeyword = (key: string): string =>
  key.replace('on', '').toLowerCase();

const camelCaseToKebab = (str: string) =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

function createDomNode(reactNode: ReactNode) {
  if (isTextElement(reactNode.element)) {
    const domNode = document.createTextNode(reactNode.element);
    return domNode as any;
  } else if (isHTMLElement(reactNode.element)) {
    const domNode = document.createElement(reactNode.element.tag);
    Object.entries(reactNode.element.props).forEach(([key, value]) => {
      if (key === 'children' || key === 'ref') {
        // Skip.
      } else if (isEvent(key)) {
        // We want to translate 'onClick' to 'click'.
        domNode.addEventListener(eventToKeyword(key), value);
      } else {
        if (key === 'className') {
          domNode.className = value;
        } else {
          domNode.setAttribute(camelCaseToKebab(key), value);
        }
      }
    });
    return domNode;
  } else {
    return null;
  }
}

function childNodeCreationFromRenderResult(
  element: ReactComponentElement,
  parentNode: ReactNode
) {
  _currentNode = parentNode;
  _stateHookIndex = 0;
  _effectHookIndex = 0;
  const renderResult = element.componentRenderFunction?.(element.props);

  if (!renderResult) {
    return null;
  }

  if (Array.isArray(renderResult)) {
    return renderResult.map((child) => createReactNode(child, parentNode));
  } else {
    return [createReactNode(renderResult, parentNode)];
  }
}

function createNestedChildrenNodes(
  child: ReactElement | ReactElement[],
  reactNode: ReactNode
): (ReactNode | null)[] | ReactNode | null {
  if (Array.isArray(child)) {
    return child.flatMap((ch) => createNestedChildrenNodes(ch, reactNode));
  } else {
    return ((child as any as number) === 0 || child) ? createReactNode(child, reactNode) : null;
  }
}

function createReactNode(
  element: ReactElement,
  parentNode: ReactNode | null,
  domNode: HTMLElement | null = null
) {
  if (typeof element === 'number' || typeof element === 'boolean') {
    element = (element as number | boolean).toString();
  }

  const reactNode: ReactNode = {
    element,
    parentNode,
    domNode,
    childNodes: null,
  };

  reactNode.childNodes = isTextElement(element)
    ? null
    : isHTMLElement(element)
    ? element.props.children
      ? Array.isArray(element.props.children)
        ? (createNestedChildrenNodes(
            element.props.children,
            reactNode
          ) as ReactNode[])
        : element.props.children
        ? [createReactNode(element.props.children, reactNode)]
        : null
      : null
    : isComponentElement(element)
    ? childNodeCreationFromRenderResult(element, reactNode)
    : null;

  if (reactNode.domNode === null) {
    reactNode.domNode = createDomNode(reactNode);
  }
  return reactNode;
}

function diffAndMountNode(
  oldReactNode: ReactNode,
  newReactNode: ReactNode,
  oldParent?: { node: ReactNode; oldIndice: number }
) {
  if (!oldReactNode && !newReactNode) {
    return;
  }

  if (!oldReactNode && newReactNode) {
    // New creation of node
    if (isHTMLElement(newReactNode.element)) {
      const parentDomNode = findNearestParentDomNode(newReactNode);
      parentDomNode.appendChild(newReactNode.domNode!);
    }

    if (oldParent) {
      oldParent.node.childNodes![oldParent.oldIndice] = newReactNode;
    }
    mountChildDomNodes(newReactNode);
    return;
  }

  if (oldReactNode && !newReactNode) {
    // Remove the node
    if (oldParent) {
      oldParent.node.childNodes?.splice(oldParent.oldIndice, 1);
    }
    unMountDomNode(oldReactNode);
    return;
  }

  if (
    isTextElement(oldReactNode.element) &&
    isTextElement(newReactNode.element)
  ) {
    oldReactNode.parentNode = newReactNode.parentNode;
    if (oldReactNode.element !== newReactNode.element) {
      oldReactNode.element = newReactNode.element;
      oldReactNode.domNode!.textContent = newReactNode.element;
    }
  } else if (
    isHTMLElement(oldReactNode.element) &&
    isHTMLElement(newReactNode.element)
  ) {
    if (oldReactNode.element.tag === newReactNode.element.tag) {
      const newChildNodes = newReactNode.childNodes;
      const newElement = newReactNode.element as ReactHTMLElement;
      newReactNode.element = oldReactNode.element;
      newReactNode.domNode = oldReactNode.domNode;
      newReactNode.parentNode = oldReactNode.parentNode;
      if (oldReactNode.childNodes && newChildNodes) {
        newChildNodes.forEach((newNode, i) => {
          diffAndMountNode(oldReactNode.childNodes![i], newNode, {
            node: oldReactNode,
            oldIndice: i,
          });
        });
      }

      Object.entries(oldReactNode.element.props).forEach(([key, value]) => {
        if (key === 'children' || key === 'ref') {
          // Skip.
        } else if (isEvent(key)) {
          oldReactNode.domNode!.removeEventListener(eventToKeyword(key), value);
          newReactNode.domNode!.addEventListener(eventToKeyword(key), newElement.props![key]);
          (oldReactNode.element as ReactHTMLElement).props[key] = newElement.props![key];
        } else {
          if (key === 'className') {
            oldReactNode.domNode!.className = newElement.props![key];
          } else {
            oldReactNode.domNode!.setAttribute(camelCaseToKebab(key), newElement.props![key]);
          }
          (oldReactNode.element as ReactHTMLElement).props[key] = newElement.props![key];
        }
      })
    } else {
      const parentDomNode = findNearestParentDomNode(oldReactNode);
      unMountDomNode(oldReactNode);
      oldReactNode.element = newReactNode.element;
      oldReactNode.childNodes = newReactNode.childNodes;
      oldReactNode.domNode = newReactNode.domNode;
      parentDomNode.appendChild(oldReactNode.domNode!);
      mountChildDomNodes(oldReactNode);
    }
  } else if (
    isComponentElement(oldReactNode.element) &&
    isComponentElement(newReactNode.element)
  ) {
    if (
      oldReactNode.element.componentRenderFunction ===
      newReactNode.element.componentRenderFunction
    ) {
      reRenderReactComponentNode(oldReactNode, newReactNode.element.props);
    } else {
      unMountDomNode(oldReactNode);
      oldReactNode.element = newReactNode.element;
      oldReactNode.childNodes = newReactNode.childNodes;
      mountChildDomNodes(oldReactNode);
    }
  } else {
    unMountDomNode(oldReactNode);
    oldReactNode.element = newReactNode.element;
    oldReactNode.childNodes = newReactNode.childNodes;
    oldReactNode.domNode = newReactNode.domNode;
    mountChildDomNodes(oldReactNode);
  }
}

function reRenderReactComponentNode(reactNode: ReactNode, newProps?: Props) {
  const oldChildNodes = reactNode.childNodes;
  const oldElement = reactNode.element as ReactComponentElement;

  if (newProps) {
    oldElement.props = newProps;
  }

  const renderResult = childNodeCreationFromRenderResult(oldElement, reactNode);

  if (renderResult && oldChildNodes) {
    renderResult.forEach((newReactNode, i) => {
      diffAndMountNode(oldChildNodes[i], newReactNode, {
        node: reactNode,
        oldIndice: i,
      });
    });
  }
}

function findNearestParentDomNode(reactNode: ReactNode): HTMLElement {
  if (reactNode.parentNode?.domNode) {
    return reactNode.parentNode?.domNode;
  }

  return findNearestParentDomNode(reactNode.parentNode!);
}

export function useState<T>(
  initialValue: T
): [val: T, setValue: (val: T | ((val: T) => T)) => void] {
  const currentNode = _currentNode as ReactNode;
  const hookIndex = _stateHookIndex;

  if (!currentNode) {
    return [initialValue, () => undefined];
  }

  const setState = (val: T | ((val: T) => T)) => {
    const newState =
      typeof val === 'function'
        ? (val as Function)(
            (currentNode.element as ReactComponentElement).stateHooks[
              hookIndex
            ][0]
          )
        : val;
    if (
      (currentNode.element as ReactComponentElement).stateHooks[
        hookIndex
      ][0] !== newState
    ) {
      (currentNode.element as ReactComponentElement).stateHooks[hookIndex][0] =
        newState;
      reRenderReactComponentNode(currentNode);
    }
  };

  if (
    (currentNode.element as ReactComponentElement).stateHooks[hookIndex] ===
    undefined
  ) {
    (currentNode.element as ReactComponentElement).stateHooks[hookIndex] = [
      initialValue,
      setState,
    ];
  }

  _stateHookIndex += 1;
  return (currentNode.element as ReactComponentElement).stateHooks[hookIndex];
}

export function useEffect(
  callback: () => void | (() => void),
  dependencies?: any[]
) {
  const currentNode = _currentNode;
  const hookIndex = _effectHookIndex;

  if (!currentNode) {
    return;
  }

  if (
    (currentNode.element as ReactComponentElement).effectHooks[hookIndex] !==
    undefined
  ) {
    if (dependencies) {
      // Execute on a dependency change
      let shouldRun = false;
      const effectHook = (currentNode.element as ReactComponentElement)
        .effectHooks[hookIndex];

      for (let j = 0; j < dependencies.length; j++) {
        if (dependencies[j] !== effectHook.dependencies?.[j]) {
          shouldRun = true;
          effectHook.dependencies![j] = dependencies[j]
        }
      }

      if (shouldRun) {
        setTimeout(() => {
          effectHook.cleanup?.();
          const cleanup = callback();
          (currentNode.element as ReactComponentElement).effectHooks[
            hookIndex
          ] = {
            callback,
            dependencies,
            cleanup: cleanup || undefined,
          };
        }, EFFECT_RUN_TIMEOUT);
      }
    } else {
      // Execute on every re-render
      setTimeout(() => {
        (currentNode.element as ReactComponentElement).effectHooks[
          hookIndex
        ].cleanup?.();
        const cleanup = callback();
        (currentNode.element as ReactComponentElement).effectHooks[hookIndex] =
          {
            callback,
            dependencies,
            cleanup: cleanup || undefined,
          };
      }, EFFECT_RUN_TIMEOUT);
    }
  } else {
    (currentNode.element as ReactComponentElement).effectHooks[hookIndex] = {
      callback,
      dependencies,
      cleanup: undefined,
    };
  }
  _effectHookIndex += 1;
}

function mountChildDomNodes(reactNode: ReactNode) {
  if (isComponentElement(reactNode.element)) {
    reactNode.element.effectHooks?.map((effectHook) => {
      setTimeout(() => {
        const cleanup = effectHook.callback();
        effectHook.cleanup = cleanup || undefined;
      }, EFFECT_RUN_TIMEOUT);
    });
  }
  reactNode.childNodes?.forEach((childNode) => {
    if (!childNode) {
      return;
    }
    if (isTextElement(childNode.element)) {
      findNearestParentDomNode(childNode).appendChild(childNode.domNode!);
    } else if (isHTMLElement(childNode.element)) {
      findNearestParentDomNode(childNode).appendChild(childNode.domNode!);
      mountChildDomNodes(childNode);
    } else if (isComponentElement(childNode.element)) {
      mountChildDomNodes(childNode);
    }
  });
}

function unMountDomNode(reactNode: ReactNode) {
    if (isComponentElement(reactNode.element)) {
        reactNode.element.effectHooks?.map((effectHook) => {
            effectHook.cleanup?.();
        });
      }

  if (isTextElement(reactNode.element)) {
    findNearestParentDomNode(reactNode).removeChild(reactNode.domNode!);
  } else if (isHTMLElement(reactNode.element)) {
    findNearestParentDomNode(reactNode).removeChild(reactNode.domNode!);
  } else if (isComponentElement(reactNode.element)) {
    reactNode.childNodes?.forEach((childNode) => {
      unMountDomNode(childNode);
    });
  }
}

export function render(
  component: ReactComponentElement,
  rootDomNode: HTMLElement
) {
  rootElementNode = createReactNode(
    createElement(rootDomNode.tagName.toLowerCase(), {}, component),
    null,
    rootDomNode
  );
  mountChildDomNodes(rootElementNode);
}
