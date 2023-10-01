import { FlipNode, type IFlipConfig, mount, register, unmount } from "flippo";
import { type DependencyList, type ReactElement, type RefCallback, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useMemo, useRef } from "react";
import { useFlipScopeContext } from "./FlipScope.js";

export interface IFlipProps extends IFlipConfig {
    id?: string;
    /** If specified, will only flip when deps change. */
    deps?: DependencyList;
    children: ReactElement | ((ref: RefCallback<HTMLElement>) => ReactElement);
}

export function Flip({ id, deps, children, ...config }: IFlipProps) {
    let scope = useFlipScopeContext();

    id ??= useId();
    if (scope.id) {
        id = scope.id + ':' + id;
        if (config.group)
            config.group = scope.id + ':' + config.group;
    }

    config.enter ??= scope.enter ?? scope.config.enter;
    config.update ??= scope.config.update;
    if (config.exit == null) // Scope will only provide exit config when it's unmounting, so need to evaluate dynamically
        Object.defineProperty(config, 'exit', { get: () => scope.exit ?? scope.config.exit });

    let parent = useContext(FlipNodeContext);
    let node = register(id, config, parent);

    useMemo(() => node.flip(), deps); // If deps aren't specified, will flip on every render

    let elementRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        let element = elementRef.current!; // Need to unmount the same element that was mounted
        element.dataset.flipid = id!;
        mount(id!, element);
        return () => unmount(id!, element);
    }, [id]);

    let ref = (element: HTMLElement) => { elementRef.current = element; };
    return createElement(FlipNodeContext.Provider, { value: node },
        typeof children == 'function'
            ? children(ref)
            : cloneElement(children, { ref }));
}

const FlipNodeContext = createContext(undefined as FlipNode | undefined);