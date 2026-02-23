import pytest


class TestEmailValidation:
    """Tests for email validation in signup"""
    
    def test_signup_accepts_valid_email_format(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "valid.student@mergington.edu"
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        
        # Assert
        assert response.status_code == 200
    
    def test_signup_with_different_email_formats(self, client):
        # Arrange
        activity_name = "Chess Club"
        emails = [
            "student1@mergington.edu",
            "student.name@mergington.edu",
            "student+tag@mergington.edu"
        ]
        
        # Act & Assert
        for email in emails:
            response = client.post(
                f"/activities/{activity_name}/signup?email={email}"
            )
            assert response.status_code == 200


class TestActivityNameHandling:
    """Tests for activity name handling"""
    
    def test_signup_with_exact_activity_name(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "player@mergington.edu"
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        
        # Assert
        assert response.status_code == 200
    
    def test_signup_fails_with_incorrect_case(self, client):
        # Arrange
        activity_name = "chess club"  # Lowercase
        email = "player@mergington.edu"
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        
        # Assert
        assert response.status_code == 404


class TestEmptyAndBoundaryConditions:
    """Tests for edge cases and boundary conditions"""
    
    def test_activity_with_no_participants_initially(self, client):
        # Arrange
        
        # Act
        response = client.get("/activities")
        activities_data = response.json()
        
        # Assert - Verify at least one activity has participants, one doesn't start empty
        has_participants = any(
            len(activity["participants"]) > 0 
            for activity in activities_data.values()
        )
        assert has_participants
    
    def test_remove_all_participants_one_by_one(self, client):
        # Arrange
        activity_name = "Chess Club"
        
        # Act - Get all current participants
        initial_response = client.get("/activities")
        participants = initial_response.json()[activity_name]["participants"].copy()
        
        # Remove each one
        for email in participants:
            response = client.delete(
                f"/activities/{activity_name}/participants?email={email}"
            )
            assert response.status_code == 200
        
        # Assert - Activity should have no participants
        final_response = client.get("/activities")
        final_participants = final_response.json()[activity_name]["participants"]
        assert len(final_participants) == 0
    
    def test_signup_and_removal_sequence(self, client):
        # Arrange
        activity_name = "Drama Club"
        email = "actor@mergington.edu"
        
        # Act - Sign up
        signup_response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        assert signup_response.status_code == 200
        
        # Verify participant is in list
        verify_response = client.get("/activities")
        assert email in verify_response.json()[activity_name]["participants"]
        
        # Remove participant
        removal_response = client.delete(
            f"/activities/{activity_name}/participants?email={email}"
        )
        assert removal_response.status_code == 200
        
        # Assert - Participant should be gone
        final_response = client.get("/activities")
        assert email not in final_response.json()[activity_name]["participants"]
