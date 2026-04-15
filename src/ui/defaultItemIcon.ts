import { ImageSourcePropType } from 'react-native'

/**
 * Fallback icon used when an item has no user-picked image.
 * Resolved once so every consumer shares the same asset reference.
 */
export const defaultItemIcon: ImageSourcePropType = require('../images/icon-default.png')
