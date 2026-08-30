package com.aozorae.edgechat.feature.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class WelcomeScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun connectServerOpensSetupFlow() {
        var continued = false
        compose.setContent {
            WelcomeScreen(language = "en-US", onContinue = { continued = true })
        }

        compose.onNodeWithText("EdgeChat").assertIsDisplayed()
        compose.onNodeWithText("Connect server").assertIsDisplayed().performClick()
        assertTrue(continued)
    }
}
