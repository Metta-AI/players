"""Policy aliases exported to Metta policy URI resolvers."""

from __future__ import annotations

from importlib import import_module

_POLICY_CLASS_PATHS = (
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemScoutPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemSignalRunnerPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemCyborgPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemBeaconPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemCircuitSentinelPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemNotTooDumbPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemNativeAcePolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemChampionPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemPathfinderPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemSleuthPolicy",
    "agent_policies.policies.cyborg.bitworld.among_them.BitWorldAmongThemTaskMarshalPolicy",
    "agent_policies.policies.cyborg.cogsguard.cvc_debugger_robot.robot.policy.RobotPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.ThinkyAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.RandomAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.RaceCarAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.CogsguardAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.CogsguardAlignAllAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.nim_agents.agents.NlankyAgentsMultiPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.baseline_agent.BaselinePolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.buggy.policy.BuggyPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.control_agent.CogsguardControlAgent",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.policy.CogsguardPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.policy.CogsguardWomboPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.targeted_agent.CogsguardTargetedAgent",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.teacher.CogsguardTeacherPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cogsguard.v2_agent.CogsguardV2Agent",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.cranky.policy.CrankyPolicy",
    "agent_policies.policies.scripted.cogsguard.scripted_agent.demo_policy.DemoPolicy",
)


def _load_class(class_path: str) -> type:
    module_path, class_name = class_path.rsplit(".", 1)
    module = import_module(module_path)
    return getattr(module, class_name)


def get_policy_aliases() -> dict[str, str]:
    aliases: dict[str, str] = {}
    for class_path in _POLICY_CLASS_PATHS:
        policy_class = _load_class(class_path)
        for short_name in policy_class.short_names:
            if short_name in aliases and aliases[short_name] != class_path:
                raise ValueError(
                    f"Policy short name {short_name!r} is already registered to {aliases[short_name]}, "
                    f"cannot register {class_path}"
                )
            aliases[short_name] = class_path
    return aliases
