import next from 'eslint-config-next'

const config = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
  },
  ...next,
]

export default config
