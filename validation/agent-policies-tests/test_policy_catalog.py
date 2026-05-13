from __future__ import annotations

import tomllib
from importlib import import_module
from pathlib import Path

from agent_policies.policy_catalog import get_policy_aliases

_OLD_COGAMES_AGENTS_SHORT_NAMES = {
    "alignall",
    "amongthem_circuit_sentinel",
    "amongthem_cyborg",
    "amongthem_pathfinder",
    "amongthem_signal_runner",
    "amongthem_sleuth",
    "amongthem_task_marshal",
    "baseline",
    "bitworld_among_them_beacon",
    "bitworld_among_them_champion",
    "bitworld_among_them_cyborg",
    "bitworld_among_them_native_ace",
    "bitworld_among_them_nottoodumb",
    "bitworld_among_them_scout",
    "bitworld_among_them_sleuth",
    "buggy",
    "cogsguard_control",
    "cogsguard_targeted",
    "cogsguard_v2",
    "cranky",
    "nim_random",
    "nlanky",
    "race_car",
    "role",
    "role_nim",
    "teacher",
    "thinky",
    "tiny_baseline",
    "wombo",
}


def test_policy_alias_entry_point_is_declared() -> None:
    pyproject = tomllib.loads(Path("pyproject.toml").read_text())

    assert pyproject["project"]["entry-points"]["mettagrid.policy_aliases"] == {
        "agent-policies": "agent_policies.policy_catalog:get_policy_aliases"
    }


def test_policy_catalog_preserves_old_cogames_agents_short_names() -> None:
    aliases = get_policy_aliases()

    assert _OLD_COGAMES_AGENTS_SHORT_NAMES <= aliases.keys()
    for short_name in _OLD_COGAMES_AGENTS_SHORT_NAMES:
        assert aliases[short_name].startswith("agent_policies.")


def test_policy_catalog_aliases_match_class_short_names() -> None:
    aliases = get_policy_aliases()

    for short_name, class_path in aliases.items():
        module_path, class_name = class_path.rsplit(".", 1)
        policy_class = getattr(import_module(module_path), class_name)

        assert short_name in policy_class.short_names
