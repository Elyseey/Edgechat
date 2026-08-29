package com.aozorae.edgechat.feature.auth

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class ServerSetupScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun continueButtonStartsDisabled() {
        compose.setContent {
            ServerSetupScreen(false, null, "en-US", {})
        }
        compose.onNodeWithText("Server address").assertIsDisplayed()
        compose.onNodeWithText("Verify and continue").assertIsNotEnabled()
    }
}
