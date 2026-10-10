import Cairo from 'cairo';

export class RingDrawing {
    paint(context, width, height, color, progress, uncertain, refreshing) {
        const size = Math.min(width, height);

        if (size <= 4)
            return;

        const radius = size / 2 - 2;
        const centerX = width / 2;
        const centerY = height / 2;
        const start = -Math.PI / 2;
        const setColor = opacity =>
            context.setSourceRGBA(
                color.red / 255,
                color.green / 255,
                color.blue / 255,
                (color.alpha / 255) * opacity
            );

        context.setLineWidth(2);
        context.setLineCap(Cairo.LineCap.ROUND);
        setColor(uncertain ? 0.45 : 0.22);
        context.setDash(uncertain ? [1, 2] : [], 0);
        context.arc(centerX, centerY, radius, start, start + Math.PI * 2);
        context.stroke();
        context.setDash([], 0);
        setColor(1);

        if (progress > 0) {
            context.arc(centerX, centerY, radius, start, start + Math.PI * 2 * progress);
            context.stroke();
        }

        if (refreshing) {
            context.arc(centerX, centerY, 1.5, 0, Math.PI * 2);
            context.fill();
        } else if (uncertain) {
            context.moveTo(centerX - 1.5, centerY);
            context.lineTo(centerX + 1.5, centerY);
            context.stroke();
        }
    }
}
