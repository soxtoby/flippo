export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] };

export interface Snapshot {
    rect: ClientRect,
    styles: StyleValues
}

export function snapshot(element: HTMLElement, extraProperties: StyleProperty[] = ['opacity']): Snapshot {
    let styles = {} as StyleValues;
    if (extraProperties.length) {
        let elementStyles = getComputedStyle(element);
        extraProperties.forEach(prop => styles[prop] = elementStyles[prop]);
    }

    return {
        rect: element.getBoundingClientRect(),
        styles
    };
}

export interface IFlip {
    previous: Snapshot,
    current: Snapshot,
    translate: [number, number];
    scale: [number, number];
    from: StyleValues;
    to: StyleValues;
}

export function flip(previous: Snapshot, target: HTMLElement, parentFlip?: IFlip): IFlip {
    let extraProperties = Object.keys(previous.styles) as StyleProperty[];
    let current = snapshot(target, extraProperties);

    let scale = [previous.rect.width / current.rect.width, previous.rect.height / current.rect.height] as [number, number];
    let translate = [previous.rect.left - current.rect.left, previous.rect.top - current.rect.top] as [number, number];

    let parentXOffset = 0;
    let parentYOffset = 0;
    let parentXScale = 1;
    let parentYScale = 1;
    let undoParentTranslate = '';
    let undoParentScale = '';
    if (parentFlip) {
        let leftOffset = current.rect.left - parentFlip.current.rect.left;
        let scaledLeftOffset = leftOffset * parentFlip.scale[0];
        let leftOffsetAdjustment = (leftOffset - scaledLeftOffset) / parentFlip.scale[0];
        parentXOffset = leftOffsetAdjustment - parentFlip.translate[0];

        let topOffset = current.rect.top - parentFlip.current.rect.top;
        let scaledTopOffset = topOffset * parentFlip.scale[1];
        let topOffsetAdjustment = (topOffset - scaledTopOffset) / parentFlip.scale[1];
        parentYOffset = topOffsetAdjustment - parentFlip.translate[1];

        parentXScale = 1 / parentFlip.scale[0];
        parentYScale = 1 / parentFlip.scale[1];

        undoParentTranslate = `translate(${parentXOffset}px, ${parentYOffset}px)`;
        undoParentScale = `scale(${parentXScale}, ${parentYScale})`;
    }

    return {
        previous, current,
        translate, scale,
        from: {
            transformOrigin: '0 0',
            transform: [
                undoParentTranslate,
                `translate(${translate[0]}px, ${translate[1]}px)`,
                undoParentScale,
                `scale(${scale[0]}, ${scale[1]})`
            ].join(' '),
            ...previous.styles
        },
        to: {
            transformOrigin: '0 0',
            transform: 'none',
            ...current.styles
        }
    };
}

let translatePattern = /translate\(([\d\.]+)px, ([\d\.]+)px\)/;
let scalePattern = /scale\(([\d\.]+), ([\d\.]+)\)/;

export function defaultAnimate(element: HTMLElement, keyframes: Keyframe[]): Promise<void> {
    return new Promise(resolve => {
        element.animate(keyframes, 250)
            .addEventListener('finish', () => resolve());
    });
}