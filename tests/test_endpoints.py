import pytest
from fastapi.testclient import TestClient


class TestRootEndpoint:
    """Tests for GET / endpoint"""
    
    def test_root_redirects_to_index(self, client):
        # Arrange
        expected_redirect_url = "/static/index.html"
        
        # Act
        response = client.get("/", follow_redirects=False)
        
        # Assert
        assert response.status_code == 307
        assert response.headers["location"] == expected_redirect_url


class TestGetActivities:
    """Tests for GET /activities endpoint"""
    
    def test_get_all_activities_returns_dict(self, client):
        # Arrange
        expected_activity_count = 9
        
        # Act
        response = client.get("/activities")
        activities_data = response.json()
        
        # Assert
        assert response.status_code == 200
        assert isinstance(activities_data, dict)
        assert len(activities_data) == expected_activity_count
    
    def test_activity_has_required_fields(self, client):
        # Arrange
        required_fields = {"description", "schedule", "max_participants", "participants"}
        
        # Act
        response = client.get("/activities")
        activities_data = response.json()
        first_activity = next(iter(activities_data.values()))
        
        # Assert
        assert response.status_code == 200
        assert set(first_activity.keys()) == required_fields
    
    def test_participants_is_list_of_emails(self, client):
        # Arrange
        expected_email_format = "@mergington.edu"
        
        # Act
        response = client.get("/activities")
        activities_data = response.json()
        
        # Assert
        for activity in activities_data.values():
            assert isinstance(activity["participants"], list)
            for participant in activity["participants"]:
                assert isinstance(participant, str)
                assert expected_email_format in participant


class TestSignupForActivity:
    """Tests for POST /activities/{activity_name}/signup endpoint"""
    
    def test_successful_signup_adds_participant(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "newstudent@mergington.edu"
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        
        # Assert
        assert response.status_code == 200
        assert "Signed up" in response.json()["message"]
        
        # Verify participant was added
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email in activities_data[activity_name]["participants"]
    
    def test_signup_prevents_duplicate_registration(self, client):
        # Arrange
        activity_name = "Chess Club"
        existing_email = "michael@mergington.edu"  # Already signed up
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={existing_email}"
        )
        
        # Assert
        assert response.status_code == 400
        assert "already signed up" in response.json()["detail"]
    
    def test_signup_fails_for_nonexistent_activity(self, client):
        # Arrange
        activity_name = "Nonexistent Activity"
        email = "student@mergington.edu"
        
        # Act
        response = client.post(
            f"/activities/{activity_name}/signup?email={email}"
        )
        
        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_signup_decreases_available_spots(self, client):
        # Arrange
        activity_name = "Basketball Team"
        email = "newplayer@mergington.edu"
        
        # Act - Get initial available spots
        initial_response = client.get("/activities")
        initial_spots = (
            initial_response.json()[activity_name]["max_participants"] -
            len(initial_response.json()[activity_name]["participants"])
        )
        
        # Sign up
        client.post(f"/activities/{activity_name}/signup?email={email}")
        
        # Get new available spots
        final_response = client.get("/activities")
        final_spots = (
            final_response.json()[activity_name]["max_participants"] -
            len(final_response.json()[activity_name]["participants"])
        )
        
        # Assert
        assert final_spots == initial_spots - 1


class TestRemoveParticipant:
    """Tests for DELETE /activities/{activity_name}/participants endpoint"""
    
    def test_successful_removal_deletes_participant(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "michael@mergington.edu"  # Already signed up
        
        # Act
        response = client.delete(
            f"/activities/{activity_name}/participants?email={email}"
        )
        
        # Assert
        assert response.status_code == 200
        assert "Removed" in response.json()["message"]
        
        # Verify participant was removed
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email not in activities_data[activity_name]["participants"]
    
    def test_removal_fails_for_nonexistent_participant(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "notregistered@mergington.edu"
        
        # Act
        response = client.delete(
            f"/activities/{activity_name}/participants?email={email}"
        )
        
        # Assert
        assert response.status_code == 400
        assert "not signed up" in response.json()["detail"]
    
    def test_removal_fails_for_nonexistent_activity(self, client):
        # Arrange
        activity_name = "Nonexistent Activity"
        email = "student@mergington.edu"
        
        # Act
        response = client.delete(
            f"/activities/{activity_name}/participants?email={email}"
        )
        
        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_removal_increases_available_spots(self, client):
        # Arrange
        activity_name = "Chess Club"
        email = "michael@mergington.edu"
        
        # Act - Get initial available spots
        initial_response = client.get("/activities")
        initial_spots = (
            initial_response.json()[activity_name]["max_participants"] -
            len(initial_response.json()[activity_name]["participants"])
        )
        
        # Remove participant
        client.delete(f"/activities/{activity_name}/participants?email={email}")
        
        # Get new available spots
        final_response = client.get("/activities")
        final_spots = (
            final_response.json()[activity_name]["max_participants"] -
            len(final_response.json()[activity_name]["participants"])
        )
        
        # Assert
        assert final_spots == initial_spots + 1
