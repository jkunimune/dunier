module.exports = {
	transform: {
		'^.+\\.ts?$': 'ts-jest',
		'^.+\\.js?$': 'babel-jest',
	},
	testEnvironment: 'node',
	testRegex: '/test/.*\\.test\\.ts$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
