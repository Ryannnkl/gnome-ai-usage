export function menuOptions(version, noAnimation) {
    return Number.parseInt(version, 10) >= 51 ? { animate: false } : noAnimation;
}

export function motionProperties(reducedMotion) {
    return reducedMotion ? ['enable-animations', 'reduced-motion'] : ['enable-animations'];
}

export function motionEnabled(settings, reducedMotion) {
    return Boolean(
        settings.enable_animations &&
            (!reducedMotion || settings.reducedMotion !== reducedMotion.REDUCE)
    );
}
