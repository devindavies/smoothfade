interface Options {
	startValue: number;
	type: "linear" | "exponential";
	fadeLength: number;
	debug: boolean;
}

const ALMOST_ZERO = 0.00001;

export default function smoothfade(
	context?: AudioContext,
	gainNode?: GainNode,
	globalOptionsParam?: Partial<Options>,
) {
	if (!gainNode || !context) {
		throw new Error("gainNode and context arguments cannot be null");
	}

	const DEFAULT_OPTIONS: Options = {
		startValue: gainNode.gain.value,
		type: "exponential",
		fadeLength: 10,
		debug: false,
	};

	const globalOptions: Options = {
		...DEFAULT_OPTIONS,
		...globalOptionsParam,
	};

	let _currentStartValue = 0;
	let _currentTargetValue = globalOptions.startValue;
	let _currentStartTime = 0;
	let _currentEndTime = context.currentTime;
	let _currDirection = "";
	const _debug = !!globalOptions.debug;

	function isFading(time?: number) {
		return time ? _currentEndTime > time : false;
	}

	function calculateInterpolationAt(time: number) {
		if (_debug) {
			console.log("calculating interpolation");
		}
		if (time <= _currentStartTime) {
			return _currentStartValue;
		}
		if (time >= _currentEndTime) {
			return _currentTargetValue;
		}
		switch (globalOptions.type) {
			case "linear":
				return (
					_currentStartValue +
					(_currentTargetValue - _currentStartValue) *
						((time - _currentStartTime) / (_currentEndTime - _currentStartTime))
				);
			case "exponential": {
				const exponent =
					(time - _currentStartTime) / (_currentEndTime - _currentStartTime);
				return (
					_currentStartValue *
					(_currentTargetValue / _currentStartValue) ** exponent
				);
			}
		}
	}

	const calculateEndTime = (startTime: number, targetValue: number) => {
		if (!isFading()) {
			return startTime + globalOptions.fadeLength;
		}
		if (targetValue === _currentStartValue) {
			const timeTillNow = context.currentTime - _currentStartTime;
			if (_debug) {
				console.log("end time will be now +", timeTillNow);
			}
			return startTime + timeTillNow;
		}
		const startValue = calculateInterpolationAt(startTime);
		let timeTaken = 0;
		if (globalOptions.type === "linear") {
			const gradient = globalOptions.fadeLength / (ALMOST_ZERO - 1);
			timeTaken = (targetValue - startValue) * gradient;
			if (_debug) {
				console.log(
					"Time taken to go linearly from ",
					startValue,
					"-",
					targetValue,
					" is ",
					timeTaken,
				);
			}
		} else if (globalOptions.type === "exponential") {
			const diff = Math.log(targetValue) - Math.log(startValue);
			timeTaken = (10 / Math.log(ALMOST_ZERO)) * diff;
			if (_debug) {
				console.log(
					"Time taken to go expoentially from ",
					startValue,
					"-",
					targetValue,
					" is ",
					timeTaken,
				);
			}
		}
		return startTime + timeTaken;
	};

	return {
		valueAt: (time = context.currentTime) => {
			if (!isFading(time)) {
				return _currentTargetValue;
			}
			return calculateInterpolationAt(time);
		},

		fadeIn: (optionsParam?: {
			startTime?: number;
			targetValue?: number;
			endTime?: number;
		}) => {
			if (_currDirection === "fadein") {
				return;
			}
			const defaultOptions = {
				startTime: context.currentTime,
				targetValue: 1,
			};

			const options = {
				...defaultOptions,
				...optionsParam,
			};

			if (!options.endTime) {
				options.endTime = calculateEndTime(
					options.startTime,
					options.targetValue,
				);
			}

			const startvalue = calculateInterpolationAt(options.startTime);
			if (_debug) {
				console.log("Start value", startvalue);
			}
			gainNode.gain.cancelScheduledValues(options.startTime);
			gainNode.gain.setValueAtTime(startvalue, options.startTime);

			if (globalOptions.type === "linear") {
				gainNode.gain.linearRampToValueAtTime(
					options.targetValue,
					options.endTime,
				);
			} else if (globalOptions.type === "exponential") {
				gainNode.gain.exponentialRampToValueAtTime(
					options.targetValue,
					options.endTime,
				);
			}

			_currentStartValue = startvalue;
			_currentTargetValue = options.targetValue;
			_currentStartTime = options.startTime;
			_currentEndTime = options.endTime;
			_currDirection = "fadein";
		},

		fadeOut: (optionsParam?: {
			startTime?: number;
			targetValue?: number;
			endTime?: number;
		}) => {
			if (_currDirection === "fadeout") {
				return;
			}

			const defaultOptions = {
				startTime: context.currentTime,
				targetValue: 1,
			};

			const options = {
				...defaultOptions,
				...optionsParam,
			};

			if (!options.endTime) {
				options.endTime = calculateEndTime(
					options.startTime,
					options.targetValue,
				);
			}

			const startvalue = calculateInterpolationAt(options.startTime);
			if (_debug) {
				console.log("Start value", startvalue);
			}
			gainNode.gain.cancelScheduledValues(options.startTime);
			gainNode.gain.setValueAtTime(startvalue, options.startTime);

			if (globalOptions.type === "linear") {
				gainNode.gain.linearRampToValueAtTime(
					options.targetValue,
					options.endTime,
				);
			} else if (globalOptions.type === "exponential") {
				gainNode.gain.exponentialRampToValueAtTime(
					options.targetValue,
					options.endTime,
				);
			}

			if (_debug) {
				console.log(
					context.currentTime,
					":: Fading out to ",
					options.targetValue,
					"starting from",
					options.startTime,
					"to",
					options.endTime,
				);
			}

			_currentStartValue = startvalue;
			_currentTargetValue = options.targetValue;
			_currentStartTime = options.startTime;
			_currentEndTime = options.endTime;
			_currDirection = "fadeout";
		},
	};
}
