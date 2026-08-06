import React from 'react';
import { cn } from '../../lib/utils';

type BGVariantType = 'dots' | 'diagonal-stripes' | 'grid' | 'horizontal-lines' | 'vertical-lines' | 'checkerboard';
type BGMaskType =
	| 'fade-center'
	| 'fade-edges'
	| 'fade-top'
	| 'fade-bottom'
	| 'fade-left'
	| 'fade-right'
	| 'fade-x'
	| 'fade-y'
	| 'none';

type BGPatternProps = React.ComponentProps<'div'> & {
	variant?: BGVariantType;
	mask?: BGMaskType;
	size?: number;
	fill?: string;
};

// Using the project's background color #181818 for the masks
const maskClasses: Record<BGMaskType, string> = {
	'fade-edges': '[mask-image:radial-gradient(ellipse_at_center,#181818,transparent)]',
	'fade-center': '[mask-image:radial-gradient(ellipse_at_center,transparent,#181818)]',
	'fade-top': '[mask-image:linear-gradient(to_bottom,transparent,#181818)]',
	'fade-bottom': '[mask-image:linear-gradient(to_bottom,#181818,transparent)]',
	'fade-left': '[mask-image:linear-gradient(to_right,transparent,#181818)]',
	'fade-right': '[mask-image:linear-gradient(to_right,#181818,transparent)]',
	'fade-x': '[mask-image:linear-gradient(to_right,transparent,#181818,transparent)]',
	'fade-y': '[mask-image:linear-gradient(to_bottom,transparent,#181818,transparent)]',
	none: '',
};

function geBgImage(variant: BGVariantType, fill: string, size: number) {
	switch (variant) {
		case 'dots':
			return `radial-gradient(${fill} 1px, transparent 1px)`;
		case 'grid':
			return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
		case 'diagonal-stripes':
			return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
		case 'horizontal-lines':
			return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
		case 'vertical-lines':
			return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
		case 'checkerboard':
			return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
		default:
			return undefined;
	}
}

const BGPattern = ({
	variant = 'grid',
	mask = 'none',
	size = 24,
	fill = '#252525',
	className,
	style,
	...props
}: BGPatternProps) => {
	const bgSize = `${size}px ${size}px`;
	const backgroundImage = geBgImage(variant, fill, size);

	return (
		<div
			className={cn('absolute inset-0 z-[-1]', maskClasses[mask], className)}
			style={{
				backgroundImage,
				backgroundSize: bgSize,
				...style,
			}}
			{...props}
		/>
	);
};

BGPattern.displayName = 'BGPattern';
export { BGPattern };
export default BGPattern;
