module.exports = {
	transform: {
		'^.+\\.ts?$': 'ts-jest',
		'^.+\\.js?$': 'babel-jest',
	},
	testEnvironment: 'node',
	testRegex: '/tests/.*\\.test\\.ts$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
