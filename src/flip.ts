import { Interpolator, map, interpolate, reduceMap, interpolateMap } from "./animate";

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
    translate: Interpolator<Translation>;
    scale: Interpolator<Scaling>;
    transforms: Interpolator<Translation | Scaling>[],
    from: StyleValues;
    to: StyleValues;

    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
}

export type Translation = { translateX: number, translateY: number };
export type Scaling = { scaleX: number, scaleY: number };

export function flip(previous: Snapshot, target: HTMLElement, parentFlip?: IFlip): IFlip {
    let extraProperties = Object.keys(previous.styles) as StyleProperty[];
    let current = snapshot(target, extraProperties);

    let scaleX = previous.rect.width / current.rect.width;
    let scaleY = previous.rect.height / current.rect.height;
    let translateX = previous.rect.left - current.rect.left;
    let translateY = previous.rect.top - current.rect.top;

    let scale = interpolateMap({ scaleX: interpolate(scaleX, 1), scaleY: interpolate(scaleY, 1) });
    let translate = interpolateMap({ translateX: interpolate(translateX, 0), translateY: interpolate(translateY, 0) });

    let transforms = [] as Interpolator<Translation | Scaling>[];
    if (parentFlip) {
        let leftOffset = current.rect.left - parentFlip.current.rect.left;
        let topOffset = current.rect.top - parentFlip.current.rect.top;

        let shiftToParentOrigin = interpolateMap({ translateX: interpolate(-leftOffset, 0), translateY: interpolate(-topOffset, 0) });
        let undoParentScale = map(parentFlip.scale, reverseScaling);
        let undoParentTranslate = map(parentFlip.translate, reverseTranslation);
        let shiftToChildOrigin = map(shiftToParentOrigin, reverseTranslation);

        transforms.push(shiftToParentOrigin, undoParentScale, undoParentTranslate, shiftToChildOrigin);
    }

    transforms.push(translate, scale);

    return {
        previous, current,
        translate, scale, transforms,
        from: {
            transformOrigin: '0 0',
            ...previous.styles
        },
        to: {
            transformOrigin: '0 0',
            ...current.styles
        },

        scaleX, scaleY, translateX, translateY
    };
}

let translatePattern = /translate\(([\d\.]+)px, ([\d\.]+)px\)/;
let scalePattern = /scale\(([\d\.]+), ([\d\.]+)\)/;

let reverseScaling = ({ scaleX, scaleY }: Scaling) => ({ scaleX: 1 / scaleX, scaleY: 1 / scaleY });
let reverseTranslation = ({ translateX, translateY }: Translation) => ({ translateX: -translateX, translateY: -translateY });

export function defaultAnimate(element: HTMLElement, keyframes: Keyframe[]): Promise<void> {
    return new Promise(resolve => {
        element.animate(keyframes, 250)
            .addEventListener('finish', () => resolve());
    });
}