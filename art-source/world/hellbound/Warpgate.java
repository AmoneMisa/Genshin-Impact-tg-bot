/*
 * This file is part of the L2J Mobius project.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package ai.areas.Hellbound.AI.NPC.Warpgate;

import org.l2jmobius.gameserver.config.GeneralConfig;
import org.l2jmobius.gameserver.entity.Location;
import org.l2jmobius.gameserver.entity.actor.Creature;
import org.l2jmobius.gameserver.entity.actor.Npc;
import org.l2jmobius.gameserver.entity.actor.Player;
import org.l2jmobius.gameserver.entity.zone.ZoneType;
import org.l2jmobius.gameserver.mechanics.script.QuestState;
import org.l2jmobius.gameserver.mechanics.script.Script;

import ai.areas.Hellbound.HellboundEngine;
import quests.Q00130_PathToHellbound.Q00130_PathToHellbound;
import quests.Q00133_ThatsBloodyHot.Q00133_ThatsBloodyHot;

/**
 * Warpgate teleport AI.
 * @author DS
 */
public class Warpgate extends Script
{
	// NPCs
	private static final int[] WARPGATES =
	{
		32314,
		32315,
		32316,
		32317,
		32318,
		32319,
	};
	
	// Locations
	private static final Location ENTER_LOC = new Location(-11272, 236464, -3248);
	private static final Location REMOVE_LOC = new Location(-16555, 209375, -3670);
	
	// Item
	private static final int MAP = 9994;
	
	// Misc
	private static final int ZONE = 40101;
	
	public Warpgate()
	{
		addStartNpc(WARPGATES);
		addFirstTalkId(WARPGATES);
		addTalkId(WARPGATES);
		addEnterZoneId(ZONE);
	}
	
	@Override
	public String onEvent(String event, Npc npc, Player player)
	{
		if (event.equals("enter"))
		{
			if (canEnter(player))
			{
				player.teleToLocation(ENTER_LOC, true);
			}
			else
			{
				return "Warpgate-03.html";
			}
		}
		else if (event.equals("TELEPORT"))
		{
			player.teleToLocation(REMOVE_LOC, true);
		}
		
		return super.onEvent(event, npc, player);
	}
	
	@Override
	public String onFirstTalk(Npc npc, Player player)
	{
		return HellboundEngine.getInstance().isLocked() ? "Warpgate-01.html" : "Warpgate-02.html";
	}
	
	@Override
	public void onEnterZone(Creature creature, ZoneType zone)
	{
		if (creature.isPlayer())
		{
			final Player player = creature.asPlayer();
			if (!canEnter(player) && !player.isGM() && !player.isOnEvent())
			{
				startQuestTimer("TELEPORT", 1000, null, player);
			}
			else if (!player.isMinimapAllowed() && hasAtLeastOneQuestItem(player, MAP))
			{
				player.setMinimapAllowed(true);
			}
		}
	}
	
	private static boolean canEnter(Player player)
	{
		if (player.isFlying())
		{
			return false;
		}
		
		if (GeneralConfig.HELLBOUND_WITHOUT_QUEST)
		{
			return true;
		}
		
		final QuestState qs1 = player.getQuestState(Q00130_PathToHellbound.class.getSimpleName());
		final QuestState qs2 = player.getQuestState(Q00133_ThatsBloodyHot.class.getSimpleName());
		return (((qs1 != null) && qs1.isCompleted()) || ((qs2 != null) && qs2.isCompleted()));
	}
}
