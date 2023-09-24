import { FlipNode, IFlipConfig, mount, register, unmount } from "flippo";
import { DependencyList, ReactElement, RefCallback, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useMemo, useRef } from "react";
import { IFlipScopeContext, useFlipScopeContext } from "./FlipScope";

export interface IFlipProps extends Partial<IFlipConfig> {
    id?: string;
    /** Flips every node in scope when it flips itself. */
    all?: boolean;
    /** If specified, will only flip when deps change. */
    deps?: DependencyList;
    children: ReactElement | ((ref: RefCallback<HTMLElement>) => ReactElement);
}

export function Flip(props: IFlipProps) {
    let { id, all, deps, children, ...config } = props;

    let scope = useFlipScopeContext();

    id ??= useId();
    if (scope.id)
        id = scope.id + ':' + id;

    let parent = useContext(FlipNodeContext);
    let node = register(id, config, parent);

    let oldScope = useRef<IFlipScopeContext>();
    if (scope != oldScope.current) {
        oldScope.current?.nodes.delete(node);
        scope.nodes.add(node);
        oldScope.current = scope;
    }

    useMemo(() => {
        if (all) {
            for (let sibling of scope.nodes)
                sibling.flip();
        } else {
            node.flip()
        }
    }, deps); // If deps aren't specified, will flip on every render

    let elementRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        let element = elementRef.current!; // Need to unmount the same element that was mounted
        element.dataset.flipid = id!;
        mount(id!, element);
        return () => {
            unmount(id!, element);
            scope.nodes?.delete(node);
        };
    }, [id]);

    let ref = (element: HTMLElement) => { elementRef.current = element; };
    return createElement(FlipNodeContext.Provider, { value: node },
        typeof children == 'function'
            ? children(ref)
            : cloneElement(children, { ref }));
}

const FlipNodeContext = createContext(undefined as FlipNode | undefined);