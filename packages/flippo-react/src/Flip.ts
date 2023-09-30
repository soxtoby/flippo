import { FlipNode, type IFlipConfig, mount, register, unmount } from "flippo";
import { type DependencyList, type ReactElement, type RefCallback, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useMemo, useRef } from "react";
import { useFlipScopeContext } from "./FlipScope.js";

export interface IFlipProps extends IFlipConfig {
    id?: string;
    /** If specified, will only flip when deps change. */
    deps?: DependencyList;
    children: ReactElement | ((ref: RefCallback<HTMLElement>) => ReactElement);
}

export function Flip(props: IFlipProps) {
    let { id, deps, children, ...config } = props;

    let scope = useFlipScopeContext();

    id ??= useId();
    if (scope.id) {
        id = scope.id + ':' + id;
        if (config.group)
            config.group = scope.id + ':' + config.group;
    }

    config.enter ??= scope.enter;
    config.update ??= scope.update;
    if (config.exit == null)
        Object.defineProperty(config, 'exit', { get: () => scope.exit }); // Scope will only provide exit config when it's unmounting

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