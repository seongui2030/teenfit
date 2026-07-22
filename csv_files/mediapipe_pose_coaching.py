#!/usr/bin/env python3
"""MediaPipe Pose 기반 5~10분 운동 자세 코칭 샘플.

지원 운동:
- squat: 스쿼트
- lunge: 런지

실행 예시:
python csv_files/mediapipe_pose_coaching.py --exercise squat
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass

import cv2
import mediapipe as mp


@dataclass
class PoseState:
    stage: str = "up"
    reps: int = 0


def angle_3pt(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    """점 a-b-c를 잇는 관절 각도(0~180) 계산."""
    radians = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    deg = abs(radians * 180.0 / math.pi)
    return 360.0 - deg if deg > 180.0 else deg


def get_landmark_xy(landmarks, idx: int) -> tuple[float, float]:
    p = landmarks[idx]
    return (p.x, p.y)


def evaluate_squat(knee_angle: float, hip_angle: float, state: PoseState) -> str:
    feedback = "good"
    if knee_angle > 165 and hip_angle > 155:
        if state.stage == "down":
            state.reps += 1
        state.stage = "up"
        feedback = "stand"
    elif knee_angle < 95 and hip_angle < 120:
        state.stage = "down"
        feedback = "down"

    if knee_angle < 60:
        feedback = "too_deep"
    elif knee_angle > 170 and state.stage == "down":
        feedback = "bend_more"
    return feedback


def evaluate_lunge(front_knee_angle: float, back_knee_angle: float, state: PoseState) -> str:
    feedback = "good"
    if front_knee_angle > 160 and back_knee_angle > 160:
        if state.stage == "down":
            state.reps += 1
        state.stage = "up"
        feedback = "reset"
    elif front_knee_angle < 105 and back_knee_angle < 120:
        state.stage = "down"
        feedback = "down"

    if front_knee_angle < 75:
        feedback = "front_knee_too_deep"
    return feedback


def draw_text(frame, text: str, y: int, color=(255, 255, 255)) -> None:
    cv2.putText(frame, text, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)


def run_coaching(exercise: str) -> None:
    mp_pose = mp.solutions.pose
    mp_draw = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(0)
    state = PoseState()

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            result = pose.process(rgb)
            rgb.flags.writeable = True

            feedback = "detecting..."
            if result.pose_landmarks:
                lm = result.pose_landmarks.landmark

                l_shoulder = get_landmark_xy(lm, mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                l_hip = get_landmark_xy(lm, mp_pose.PoseLandmark.LEFT_HIP.value)
                l_knee = get_landmark_xy(lm, mp_pose.PoseLandmark.LEFT_KNEE.value)
                l_ankle = get_landmark_xy(lm, mp_pose.PoseLandmark.LEFT_ANKLE.value)

                r_hip = get_landmark_xy(lm, mp_pose.PoseLandmark.RIGHT_HIP.value)
                r_knee = get_landmark_xy(lm, mp_pose.PoseLandmark.RIGHT_KNEE.value)
                r_ankle = get_landmark_xy(lm, mp_pose.PoseLandmark.RIGHT_ANKLE.value)

                left_knee_angle = angle_3pt(l_hip, l_knee, l_ankle)
                left_hip_angle = angle_3pt(l_shoulder, l_hip, l_knee)
                right_knee_angle = angle_3pt(r_hip, r_knee, r_ankle)

                if exercise == "squat":
                    feedback = evaluate_squat(left_knee_angle, left_hip_angle, state)
                else:
                    feedback = evaluate_lunge(left_knee_angle, right_knee_angle, state)

                mp_draw.draw_landmarks(frame, result.pose_landmarks, mp_pose.POSE_CONNECTIONS)

                draw_text(frame, f"left_knee: {left_knee_angle:.1f}", 50)
                draw_text(frame, f"left_hip: {left_hip_angle:.1f}", 80)
                draw_text(frame, f"right_knee: {right_knee_angle:.1f}", 110)

            draw_text(frame, f"exercise: {exercise}", 150, (0, 255, 255))
            draw_text(frame, f"stage: {state.stage}", 180, (0, 255, 255))
            draw_text(frame, f"reps: {state.reps}", 210, (0, 255, 255))
            draw_text(frame, f"feedback: {feedback}", 240, (0, 255, 0))
            draw_text(frame, "ESC to quit", 270, (180, 180, 180))

            cv2.imshow("MediaPipe Pose Coaching", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break

    cap.release()
    cv2.destroyAllWindows()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MediaPipe 기반 운동 자세 코칭")
    parser.add_argument("--exercise", choices=["squat", "lunge"], default="squat")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    run_coaching(args.exercise)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
